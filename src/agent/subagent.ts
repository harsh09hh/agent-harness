import { tool, type ModelMessage, type ToolSet } from "ai";
import z from "zod";
import { runLoop } from "./loop.ts";
import { needsApproval } from "./approval.ts";
import { readFile, listFiles } from "./tools/index.ts";
import { SUBAGENT_PROMPT } from "./system/prompts.ts";
import { SUBAGENT_MODEL } from "./models.ts";
import type { AgentCallbacks, SubAgentUpdate, ToolCallInfo } from "../types.ts";

// The main agent sees only this definition; runLoop hands its calls to createSubAgentRunner
export const spawnAgent = tool({
  description:
    "Start a sub-agent that researches one task on its own and reports back. Use it for work that " +
    "needs many file reads, or splits into independent parts (call it several times in one reply " +
    "to run them side by side). Do not use it for a single file, a small edit, or a question you " +
    "can answer directly. Sub-agents can only read files, not change them.",
  inputSchema: z.object({
    description: z.string().describe("3-5 word label shown to the user, e.g. 'trace tool approval'"),
    prompt: z
      .string()
      .describe(
        "The full task. The sub-agent cannot see this conversation, so include everything it " +
          "needs: the goal, which files or folders to look at, and what to put in its report.",
      ),
  }),
});

// read-only, so several sub-agents can safely run at once
const SUBAGENT_TOOLS: ToolSet = { readFile, listFiles };
const MAX_STEPS = 15;
// Groq's free tier allows about 30 requests a minute; two agents at once stays under it
const MAX_PARALLEL = 2;
const MAX_PER_MESSAGE = 4;

// One runner per user message, so the MAX_PER_MESSAGE budget resets each turn
export function createSubAgentRunner(callbacks: AgentCallbacks) {
  let left = MAX_PER_MESSAGE;

  return async (calls: ToolCallInfo[]): Promise<string[]> => {
    const results: string[] = new Array(calls.length);
    let next = 0;

    // a small worker pool: at most MAX_PARALLEL sub-agents talk to the model at once
    const worker = async () => {
      while (next < calls.length) {
        const index = next++;
        results[index] =
          left-- > 0
            ? await runSubAgent(calls[index], callbacks)
            : "Not run: the limit of sub-agents for one message was reached. Do this part yourself.";
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, calls.length) }, worker));
    return results;
  };
}

async function runSubAgent(call: ToolCallInfo, callbacks: AgentCallbacks): Promise<string> {
  const { description = "sub-agent", prompt = "" } = call.args as {
    description?: string;
    prompt?: string;
  };
  let step = 0;
  const update = (patch: Partial<SubAgentUpdate>) =>
    callbacks.onSubAgentUpdate?.({
      id: call.toolCallId,
      description,
      status: "running",
      step,
      ...patch,
    });
  update({});

  // a fresh history: the sub-agent sees its task and nothing of the main conversation
  const messages: ModelMessage[] = [
    { role: "system", content: `${SUBAGENT_PROMPT}\n\nCurrent working directory: ${process.cwd()}` },
    { role: "user", content: prompt },
  ];

  try {
    const { lastText, stopReason } = await runLoop({
      modelName: SUBAGENT_MODEL,
      messages,
      tools: SUBAGENT_TOOLS,
      maxSteps: MAX_STEPS,
      hooks: {
        // its text is not streamed into the chat; only the final report is used
        onToken: () => {},
        onToolCallStart: (tc) =>
          update({
            currentTool: `${tc.toolName} ${String(tc.args.path ?? tc.args.directory ?? "")}`.trim(),
          }),
        onToolCallEnd: () => {},
        // a sub-agent cannot ask the user, so anything that needs approval is refused
        approve: async (tc) => !needsApproval(tc.toolName, tc.args),
        onStep: () => {
          step++;
          update({});
        },
      },
    });

    const report = lastText.trim() || "(the sub-agent finished without a report)";
    const note =
      stopReason === "max-steps"
        ? `\n\n[Stopped after ${MAX_STEPS} steps - the task may be unfinished.]`
        : stopReason === "rejected"
          ? "\n\n[Stopped: it tried a tool that needs the user's approval, which sub-agents cannot ask for.]"
          : "";
    update({ status: "done", currentTool: undefined, result: report });
    return report + note;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    update({ status: "failed", currentTool: undefined, result: message });
    return `Sub-agent failed: ${message}`;
  }
}
