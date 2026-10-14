import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractMessageText } from "./tokenEstimator.ts";
import { groq } from "@ai-sdk/groq";
import { DEFAULT_MODEL, getModel } from "../models.ts";


const SUMMARIZATION_PROMPT = `You are a conversation summarizer. Your task is to create a concise summary of the conversation so far that preserves:

1. Key decisions and conclusions reached
2. Important context and facts mentioned
3. Any pending tasks or questions
4. The overall goal of the conversation

Be concise but complete. The summary should allow the conversation to continue naturally.

Conversation to summarize:
`;


// formating the message into a array

export function messagesToText(messages:ModelMessage[]){
    
    return messages.map((msg)=>{
        const role =msg.role.toUpperCase();
        const content= extractMessageText(msg);
        return `[${role}]:${content}`;
    })
    .join("\n\n");
}


/**
 * Compact a conversation by summarizing it with an LLM.
 *
 * Takes the current messages (excluding system prompt) and returns a new
 * messages array with:
 * - A user message containing the summary
 * - An assistant acknowledgment
 *
 * The system prompt should be prepended by the caller.
 */



export async function compactConversation(
    messages:ModelMessage[],
    model:string=DEFAULT_MODEL,
):Promise<ModelMessage[]>{

 const conversationMessages = messages.filter((m) => m.role !== "system");

  if (conversationMessages.length === 0) {
    return [];
  }
    const conversationText = messagesToText(conversationMessages);

    const {text:summary} =await generateText({
        // model:groq('openai/gpt-oss-120b'),
        model:getModel(model),
        prompt:SUMMARIZATION_PROMPT + conversationText,

    });

      // Create compacted messages
  const compactedMessages: ModelMessage[] = [
    {
      role: "user",
      content: `[CONVERSATION SUMMARY]\nThe following is a summary of our conversation so far:\n\n${summary}\n\nPlease continue from where we left off.`,
    },
    {
      role: "assistant",
      content:
        "I understand. I've reviewed the summary of our conversation and I'm ready to continue. How can I help you next?",
    },
  ];

  return compactedMessages;
}