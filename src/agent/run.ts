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

  const messages: ModelMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

    let fullResponse = "";


   while (true) {
    const result = streamText({
      // model: openai('gpt-4.1'),
      // model: google('gemini-3.6-flash'),
      model: groq('openai/gpt-oss-120b'),
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
    
    //executing each tool call and adding results to message history

    for(const tc of toolCalls){
        const toolResult  = await executeTool(tc.toolName, tc.args);
        callbacks.onToolCallEnd(tc.toolName, toolResult);
        messages.push({
            role:"tool",
            content:[
                {
                    type:"tool-result",
                    toolCallId:tc.toolCallId,
                    toolName:tc.toolName,
                    output:{ type:"text" ,value:toolResult},
                },
            ],
        });
    }

    }
    callbacks.onComplete(fullResponse);
    return messages;
    
}