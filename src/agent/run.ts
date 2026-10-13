import { streamText, type ModelMessage, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { aiSdkTelemetry } from "@lmnr-ai/lmnr";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTool.ts";
import { SYSTEM_PROMPT } from "./system/prompts.ts";
import { Laminar } from "@lmnr-ai/lmnr";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import {
  estimateMessagesTokens,
  getModelLimits,
  isOverThreshold,
  calculateUsagePercentage,
  compactConversation,
  DEFAULT_THRESHOLD,
} from "./context/index.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";

const MODEL_NAME = "openai/gpt-oss-120b";

// Initialize Laminar for observability (optional - traces LLM calls)
Laminar.initialize({
  projectApiKey: process.env.LMNR_API_KEY,
});

// The loop below runs the tools itself (executeTool), so the model gets them
// without execute - otherwise the SDK runs each tool too and every call happens twice
const modelTools: ToolSet = Object.fromEntries(
  Object.entries(tools).map(([name, { execute, ...definition }]) => [name, definition]),
);




export async function runAgent(
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
):Promise<ModelMessage[]> {



      const modelLimits = getModelLimits(MODEL_NAME);

  // Filter and check if we need to compact
  // (the history we return starts with the system prompt - drop it here so it is not added again every turn)
  let workingHistory: ModelMessage[] = filterCompatibleMessages(conversationHistory).filter(
    (msg) => msg.role !== "system",
  );
  const preCheckTokens = estimateMessagesTokens([
    { role: "system", content: SYSTEM_PROMPT },
    ...workingHistory,
    { role: "user", content: userMessage },
  ]);

  if (isOverThreshold(preCheckTokens.total, modelLimits.contextWindow)) {
    workingHistory = await compactConversation(workingHistory, MODEL_NAME);
  }

  const messages: ModelMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
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

    let fullResponse = "";

   while (true) {
    const result = streamText({
      // model: openai('gpt-4.1'),
      // model: google('gemini-3.6-flash'),
      model: groq(MODEL_NAME),
      messages,
      allowSystemInMessages: true,
      tools: modelTools,
      experimental_telemetry: {
        isEnabled: true,
        integrations: aiSdkTelemetry(),
      },
    });

    const toolCalls: ToolCallInfo[] = [];
    let currentText = "";

    for await (const chunk of result.fullStream) {
      if (chunk.type === "text-delta") {
        currentText += chunk.text;
        callbacks.onToken(chunk.text);
      }

      if (chunk.type === "tool-call") {
        const input = "input" in chunk ? chunk.input : {};
        toolCalls.push({
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: input as Record<string, unknown>,
        });
        callbacks.onToolCallStart(chunk.toolName, input);
      }
    }

    fullResponse += currentText;

    const finishReason = await result.finishReason;

    // if LLM didn't request any tool calls we are done 
    if(toolCalls.length===0|| finishReason!=="tool-calls"){
        const responceMessage = await result.response;
        messages.push(...responceMessage.messages);
        break;
    }

    // Add the assistant's responce (with tool call request) to history
    const responceMessage = await result.response;
    messages.push(...responceMessage.messages);
    
    // Process tool calls sequentially with approval for each
    let rejected = false;
    for (const tc of toolCalls) {
      // after one rejection the remaining calls in this step are skipped without asking
      const approved = !rejected && (await callbacks.onToolApproval(tc.toolName, tc.args));

      if (!approved) {
        rejected = true;
        // every tool call needs a result in the history, otherwise the next
        // message fails with "Tool result is missing for tool call"
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              output: { type: "text", value: "Tool call rejected by the user." },
            },
          ],
        });
        continue;
      }

      const result = await executeTool(tc.toolName, tc.args);
      callbacks.onToolCallEnd(tc.toolName, result);

      messages.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            output: { type: "text", value: result },
          },
        ],
      });
      reportTokenUsage();
    }

    if (rejected) {
      break;
    }

    }
    callbacks.onComplete(fullResponse);
    return messages;
    
}