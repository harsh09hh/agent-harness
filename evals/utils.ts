import { tool, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "../src/agent/system/prompts.ts";
import type { EvalData } from "./types.ts";

/**
 * Build message array from eval data
 */
export const buildMessages = (
  data: EvalData | { prompt?: string; systemPrompt?: string },
): ModelMessage[] => {
  const systemPrompt = data.systemPrompt ?? SYSTEM_PROMPT;
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: data.prompt! },
  ];
};
