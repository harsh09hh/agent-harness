import type { ModelMessage } from "ai";

/**
 * Input data for single-turn tool selection evaluations.
 * Tests whether the LLM selects the correct tools without executing them.
 */
export interface EvalData {
  // the promt give by the user
  prompt: string;
  // the system prompt
  systemPrompt?: string;
  /** Tool names to make available for this evaluation */
  tools: string[];
  // the configuration of  the llm 
  config?: {
    model?: string;
    temperature?: number;
  };
}

/**
 * Target expectations for single-turn evaluations
 */
export interface EvalTarget {
  /** Tools that MUST be selected (golden prompts) */
  expectedTools?: string[];
  /** Tools that MUST NOT be selected (negative prompts) */
  forbiddenTools?: string[];
  /** Category for grouping and filtering */
  category: "golden" | "secondary" | "negative";
}

/**
 * Result from single-turn executor
 */
export interface SingleTurnResult {
  /** Raw tool calls from the LLM */
  toolCalls: Array<{ toolName: string; args: unknown }>;
  /** Just the tool names for easy comparison */
  toolNames: string[];
  /** Whether any tool was selected */
  selectedAny: boolean;
}
