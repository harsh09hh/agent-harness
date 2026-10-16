import type { ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { tools } from "./tools/index.ts";
import { runLoop } from "./loop.ts";
import { needsApproval } from "./approval.ts";
import { spawnAgent, createSubAgentRunner } from "./subagent.ts";
import { SYSTEM_PROMPT } from "./system/prompts.ts";
import { Laminar } from "@lmnr-ai/lmnr";
import type { AgentCallbacks } from "../types.ts";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { DEFAULT_MODEL } from "./models.ts";
import {
  estimateMessagesTokens,
  getModelLimits,
  isOverThreshold,
  calculateUsagePercentage,
  compactConversation,
  DEFAULT_THRESHOLD,
} from "./context/index.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";

// Initialize Laminar for observability (optional - traces LLM calls)
Laminar.initialize({
  projectApiKey: process.env.LMNR_API_KEY,
});

export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
  modelName: string = DEFAULT_MODEL,
):Promise<ModelMessage[]> {



      const modelLimits = getModelLimits(modelName);

  // tell the model which folder it is working in (the user can change it from the UI)
  const systemPrompt = `${SYSTEM_PROMPT}\n\nCurrent working directory: ${process.cwd()}`;

  // Filter and check if we need to compact
  // (the history we return starts with the system prompt - drop it here so it is not added again every turn)
  let workingHistory: ModelMessage[] = filterCompatibleMessages(conversationHistory).filter(
    (msg) => msg.role !== "system",
  );
  const preCheckTokens = estimateMessagesTokens([
    { role: "system", content: systemPrompt },
    ...workingHistory,
    { role: "user", content: userMessage },
  ]);

  if (isOverThreshold(preCheckTokens.total, modelLimits.contextWindow)) {
    workingHistory = await compactConversation(workingHistory, modelName);
  }

  const messages: ModelMessage[] = [
    { role: "system", content: systemPrompt },
    ...workingHistory,
    { role: "user", content: userMessage },
  ];

  // Report token usage throughout the loop
  const reportTokenUsage = () => {
    if (callbacks.onTokenUsage) {
      const usage = estimateMessagesTokens(messages);
      callbacks.onTokenUsage({
        inputTokens: usage.input,
        outputTokens: usage.output,
        totalTokens: usage.total,
        contextWindow: modelLimits.contextWindow,
        threshold: DEFAULT_THRESHOLD,
        percentage: calculateUsagePercentage(
          usage.total,
          modelLimits.contextWindow,
        ),
      });
    }
  };

  reportTokenUsage();

  // the loop itself lives in loop.ts, shared with the sub-agents started by spawnAgent
  const { text } = await runLoop({
    modelName,
    messages,
    tools: { ...tools, spawnAgent },
    hooks: {
      onToken: callbacks.onToken,
      onToolCallStart: (call) => callbacks.onToolCallStart(call.toolName, call.args, call.toolCallId),
      onToolCallEnd: (call, result) => callbacks.onToolCallEnd(call.toolName, result, call.toolCallId),
      // ask only where it is needed (see approval.ts)
      approve: (call) =>
        needsApproval(call.toolName, call.args)
          ? callbacks.onToolApproval(call.toolName, call.args)
          : Promise.resolve(true),
      onStep: reportTokenUsage,
    },
    delegate: { toolName: "spawnAgent", run: createSubAgentRunner(callbacks) },
  });

  callbacks.onComplete(text);
  return messages;
}
