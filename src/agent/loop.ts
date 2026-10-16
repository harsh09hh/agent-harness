import { streamText, type ModelMessage, type ToolSet } from "ai";
import { aiSdkTelemetry } from "@lmnr-ai/lmnr";
import { getModel } from "./models.ts";
import { executeTool } from "./executeTool.ts";
import type { ToolCallInfo } from "../types.ts";

export interface LoopHooks {
  onToken: (token: string) => void;
  // the model has started writing a tool call's input (a long writeFile can take a while)
  onToolInputStart?: (toolName: string) => void;
  onToolCallStart: (call: ToolCallInfo) => void;
  onToolCallEnd: (call: ToolCallInfo, result: string) => void;
  // false = do not run it; the loop records a rejection and stops
  approve: (call: ToolCallInfo) => Promise<boolean>;
  // after each round of tool results (the main agent reports token usage here)
  onStep?: () => void;
}

export interface LoopResult {
  text: string; // everything the model wrote
  lastText: string; // what it wrote in its final step (a sub-agent's report)
  stopReason: "done" | "rejected" | "max-steps";
}

// The model gets the tools without execute: the loop runs them itself (approval first),
// otherwise the SDK would run each tool too and every call would happen twice
function withoutExecute(tools: ToolSet): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, { execute, ...definition }]) => [name, definition]),
  );
}

export async function runLoop({
  modelName,
  messages,
  tools,
  hooks,
  maxSteps = Infinity,
  delegate,
}: {
  modelName: string;
  messages: ModelMessage[]; // starts with the system prompt; the loop appends to it
  tools: ToolSet;
  hooks: LoopHooks;
  maxSteps?: number;
  // a tool the loop hands off instead of running (spawnAgent): all its calls from
  // one step go to run() together, which returns one result per call
  delegate?: { toolName: string; run: (calls: ToolCallInfo[]) => Promise<string[]> };
}): Promise<LoopResult> {
  const modelTools = withoutExecute(tools);
  let fullResponse = "";

  for (let step = 0; step < maxSteps; step++) {
    const result = streamText({
      model: getModel(modelName),
      messages,
      allowSystemInMessages: true,
      tools: modelTools,
      experimental_telemetry: { isEnabled: true, integrations: aiSdkTelemetry() },
    });

    const toolCalls: ToolCallInfo[] = [];
    let currentText = "";

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        currentText += chunk.text;
        hooks.onToken(chunk.text);
      }
      if (chunk.type === "tool-input-start") {
        hooks.onToolInputStart?.(chunk.toolName);
      }
      if (chunk.type === "tool-call") {
        const call: ToolCallInfo = {
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: ("input" in chunk ? chunk.input : {}) as Record<string, unknown>,
        };
        toolCalls.push(call);
        hooks.onToolCallStart(call);
      }
    }

    fullResponse += currentText;
    const finishReason = await result.finishReason;
    messages.push(...(await result.response).messages);

    // if the LLM didn't request any tool calls we are done
    if (toolCalls.length === 0 || finishReason !== "tool-calls") {
      return { text: fullResponse, lastText: currentText, stopReason: "done" };
    }

    const results = new Map<string, string>();
    const delegated = toolCalls.filter((tc) => tc.toolName === delegate?.toolName);
    let rejected = false;

    // normal tools: one at a time, asking for approval where needed (as before)
    for (const tc of toolCalls) {
      if (delegated.includes(tc)) continue;
      // after one rejection the remaining calls in this step are skipped without asking
      if (rejected || !(await hooks.approve(tc))) {
        rejected = true;
        results.set(tc.toolCallId, "Tool call rejected by the user.");
        continue;
      }
      const output = await executeTool(tc.toolName, tc.args);
      hooks.onToolCallEnd(tc, output);
      results.set(tc.toolCallId, output);
    }

    // spawnAgent calls: all of this step's run together
    if (delegate && delegated.length > 0) {
      const outputs = rejected
        ? delegated.map(() => "Skipped: an earlier tool call in this step was rejected.")
        : await delegate.run(delegated);
      delegated.forEach((tc, i) => {
        hooks.onToolCallEnd(tc, outputs[i]);
        results.set(tc.toolCallId, outputs[i]);
      });
    }

    // every tool call needs a result in the history, otherwise the next
    // message fails with "Tool result is missing for tool call"
    for (const tc of toolCalls) {
      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            output: { type: "text", value: results.get(tc.toolCallId) ?? "" },
          },
        ],
      });
    }
    hooks.onStep?.();

    if (rejected) return { text: fullResponse, lastText: currentText, stopReason: "rejected" };
  }

  return { text: fullResponse, lastText: "", stopReason: "max-steps" };
}