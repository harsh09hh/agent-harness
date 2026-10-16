import React, { useState, useCallback, useRef } from "react";
import {
  Box,
  Text,
  useApp,
  useInput,
  useWindowSize,
  useBoxMetrics,
  type DOMElement,
} from "ink";
import type { ModelMessage } from "ai";
import { runAgent } from "../agent/run.ts";
import { DEFAULT_MODEL, missingKey } from "../agent/models.ts";
import { MessageList, type Message } from "./components/MessageList.tsx";
import { ToolCall, type ToolCallProps } from "./components/ToolCall.tsx";
import { Spinner } from "./components/Spinner.tsx";
import { Input } from "./components/Input.tsx";
import { ToolApproval } from "./components/ToolApproval.tsx";
import { FolderPicker } from "./components/FolderPicker.tsx";
import { ModelPicker } from "./components/ModelPicker.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { Markdown } from "./components/Markdown.tsx";
import { SubAgentView } from "./components/SubAgentView.tsx";
import type { ToolApprovalRequest, TokenUsageInfo, SubAgentUpdate } from "../types.ts";

interface ActiveToolCall extends ToolCallProps {
  id: string;
}

// a line left in the chat about the sub-agents a message used, so it is still
// visible after their live rows are cleared
function subAgentNote(agents: Map<string, SubAgentUpdate>): Message[] {
  if (agents.size === 0) return [];
  const list = [...agents.values()]
    .map(
      (agent) =>
        `${agent.description} ${agent.status === "failed" ? "✗" : "✓"} (${agent.step} step${agent.step === 1 ? "" : "s"})`,
    )
    .join(" · ");
  return [
    {
      role: "note",
      content: `⇢ used ${agents.size} sub-agent${agents.size === 1 ? "" : "s"}: ${list}`,
    },
  ];
}

export function App() {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    ModelMessage[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolCall[]>([]);
  // sub-agents started with spawnAgent during the current message
  const [subAgents, setSubAgents] = useState<SubAgentUpdate[]>([]);
  // what the agent is doing right now, shown next to the spinner while it works
  const [activity, setActivity] = useState("Thinking");
  const [pendingApproval, setPendingApproval] =
    useState<ToolApprovalRequest | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  // the folder the agent works in (relative paths and code execution use it)
  const [folder, setFolder] = useState(process.cwd());
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  // the model the agent uses (the user can change it from the UI with Tab)
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [isPickingModel, setIsPickingModel] = useState(false);
  // how many lines the message area is scrolled up from the newest message
  const [scrollUp, setScrollUp] = useState(0);

  // the message area is a fixed-height window onto the (taller) list of messages
  const viewportRef = useRef<DOMElement>(null);
  const contentRef = useRef<DOMElement>(null);
  const viewport = useBoxMetrics(viewportRef);
  const content = useBoxMetrics(contentRef);
  const maxScroll = Math.max(0, content.height - viewport.height);
  const offset = Math.max(0, maxScroll - scrollUp);

  useInput((_input, key) => {
    // the approval prompt and the pickers use the arrow keys themselves
    const arrowsFree = !pendingApproval && !isPickingFolder && !isPickingModel;
    const page = Math.max(1, viewport.height - 2);

    if (key.pageUp) {
      setScrollUp((prev) => Math.min(maxScroll, prev + page));
    } else if (key.pageDown) {
      setScrollUp((prev) => Math.max(0, prev - page));
    } else if (key.upArrow && arrowsFree) {
      setScrollUp((prev) => Math.min(maxScroll, prev + 1));
    } else if (key.downArrow && arrowsFree) {
      setScrollUp((prev) => Math.max(0, prev - 1));
    }
  });

  const handleFolderSelect = useCallback((selected: string) => {
    setIsPickingFolder(false);
    try {
      process.chdir(selected);
      setFolder(process.cwd());
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Working folder set to ${process.cwd()}` },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Could not open that folder: ${errorMessage}` },
      ]);
    }
    setScrollUp(0);
  }, []);

  const handleModelSelect = useCallback((selected: string) => {
    setIsPickingModel(false);
    setModel(selected);
    const missing = missingKey(selected);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: missing
          ? `Model set to ${selected}, but ${missing} is not set in .env - requests will fail until you add it.`
          : `Model set to ${selected}`,
      },
    ]);
    setScrollUp(0);
  }, []);

  const handleSubmit = useCallback(
    async (userInput: string) => {
      if (
        userInput.toLowerCase() === "exit" ||
        userInput.toLowerCase() === "quit"
      ) {
        exit();
        return;
      }

      setMessages((prev) => [...prev, { role: "user", content: userInput }]);
      setIsLoading(true);
      setStreamingText("");
      setActiveToolCalls([]);
      setSubAgents([]);
      setActivity("Thinking");
      setScrollUp(0);
      // every sub-agent this message starts, for the note left in the chat afterwards
      const usedSubAgents = new Map<string, SubAgentUpdate>();

      try {
        const newHistory = await runAgent(userInput, conversationHistory, {
          onToken: (token) => {
            setStreamingText((prev) => prev + token);
            setActivity("Writing");
          },
          onToolInputStart: (name) => {
            setActivity(name === "spawnAgent" ? "Planning sub-agents" : `Preparing ${name}`);
          },
          onToolCallStart: (name, args, toolCallId) => {
            setActivity(name === "spawnAgent" ? "Starting sub-agents" : `Running ${name}`);
            setActiveToolCalls((prev) => [
              ...prev,
              {
                id: toolCallId,
                name,
                args,
                status: "pending",
              },
            ]);
          },
          // matched by id: two calls to the same tool in one step are separate rows
          onToolCallEnd: (_name, result, toolCallId) => {
            // the model is called again next, with the result
            setActivity("Thinking");
            setActiveToolCalls((prev) =>
              prev.map((tc) =>
                tc.id === toolCallId ? { ...tc, status: "complete", result } : tc,
              ),
            );
          },
          onSubAgentUpdate: (update) => {
            usedSubAgents.set(update.id, update);
            setSubAgents((prev) =>
              prev.some((agent) => agent.id === update.id)
                ? prev.map((agent) => (agent.id === update.id ? update : agent))
                : [...prev, update],
            );
          },
          onComplete: (response) => {
            setMessages((prev) => [
              ...prev,
              ...subAgentNote(usedSubAgents),
              ...(response ? [{ role: "assistant" as const, content: response }] : []),
            ]);
            setStreamingText("");
            setActiveToolCalls([]);
            setSubAgents([]);
          },
          onToolApproval: (name, args) => {
            return new Promise<boolean>((resolve) => {
              setPendingApproval({ toolName: name, args, resolve });
            });
          },
          onTokenUsage: (usage) => {
            setTokenUsage(usage);
          },
        }, model);

        setConversationHistory(newHistory);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          ...subAgentNote(usedSubAgents),
          { role: "assistant", content: `Error: ${errorMessage}` },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationHistory, exit, model],
  );

  const runningSubAgents = subAgents.filter((agent) => agent.status === "running").length;
  const activityLabel =
    runningSubAgents > 0
      ? `Waiting for ${runningSubAgents} sub-agent${runningSubAgents === 1 ? "" : "s"}`
      : activity;

  return (
    <Box flexDirection="column" width={columns} height={rows} paddingX={1}>
      {/* header */}
      <Box flexShrink={0}>
        {/* one Text so it wraps as a single paragraph in a narrow terminal */}
        <Text>
          <Text bold color="magenta">
            🤖 AI Agent
          </Text>
          <Text dimColor>
            {" "}
            (type "exit" to quit · + to change folder · Tab to change model · PgUp/PgDn to scroll)
          </Text>
        </Text>
      </Box>

      {/* message area: fills the space between the header and the input bar */}
      <Box
        ref={viewportRef}
        flexGrow={1}
        flexShrink={1}
        flexBasis={0}
        flexDirection="column"
        overflow="hidden"
        contentOffsetY={offset}
      >
        <Box ref={contentRef} flexDirection="column" flexShrink={0}>
          <MessageList messages={messages} />

          {streamingText && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="green" bold>
                › Assistant
              </Text>
              <Box marginLeft={2}>
                <Markdown text={streamingText} width={columns - 4} />
              </Box>
            </Box>
          )}

          {activeToolCalls.length > 0 && !pendingApproval && (
            <Box flexDirection="column" marginTop={1}>
              {activeToolCalls
                // spawnAgent calls are shown as sub-agent rows below
                .filter((tc) => tc.name !== "spawnAgent")
                .map((tc) => (
                  <ToolCall
                    key={tc.id}
                    name={tc.name}
                    args={tc.args}
                    status={tc.status}
                    result={tc.result}
                  />
                ))}
              {subAgents.map((agent) => (
                <SubAgentView key={agent.id} agent={agent} />
              ))}
            </Box>
          )}

          {/* always shown while the agent works, so a pause (the model reasoning, a long
              tool input, a rate-limit retry) still shows it is busy and for how long */}
          {isLoading && !pendingApproval && (
            <Box marginTop={1}>
              <Spinner key={activityLabel} label={`${activityLabel}...`} />
            </Box>
          )}
        </Box>
      </Box>

      {/* bottom of the screen: input bar (or approval / folder picker), then the status line */}
      <Box flexDirection="column" flexShrink={0}>
        {scrollUp > 0 && (
          <Text dimColor>  ↓ scrolled up {scrollUp} lines · PgDn for the latest</Text>
        )}

        {pendingApproval ? (
          <ToolApproval
            toolName={pendingApproval.toolName}
            args={pendingApproval.args}
            onResolve={(approved) => {
              if (!approved) {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `Rejected ${pendingApproval.toolName} - it was not run.`,
                  },
                ]);
              }
              pendingApproval.resolve(approved);
              setPendingApproval(null);
            }}
          />
        ) : isPickingFolder ? (
          <FolderPicker
            startPath={folder}
            onSelect={handleFolderSelect}
            onCancel={() => setIsPickingFolder(false)}
          />
        ) : isPickingModel ? (
          <ModelPicker
            current={model}
            onSelect={handleModelSelect}
            onCancel={() => setIsPickingModel(false)}
          />
        ) : (
          <Input
            onSubmit={handleSubmit}
            disabled={isLoading}
            onPlus={() => setIsPickingFolder(true)}
            onTab={() => setIsPickingModel(true)}
          />
        )}

        <StatusBar folder={folder} model={model} usage={tokenUsage} />
      </Box>
    </Box>
  );
}
