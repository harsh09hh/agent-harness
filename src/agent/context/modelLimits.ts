import type { ModelLimits } from "../../types.ts";

/**
 * Default threshold for context window usage (80%)
 */
export const DEFAULT_THRESHOLD = 0.8;

/**
 * Model limits registry
 */
const MODEL_LIMITS: Record<string, ModelLimits> = {
  "gpt-5": {
    inputLimit: 272000,
    outputLimit: 128000,
    contextWindow: 400000,
  },
  "gpt-5-mini": {
    inputLimit: 272000,
    outputLimit: 128000,
    contextWindow: 400000,
  },
};

/**
 * Default limits used when model is not found in registry
 */
const DEFAULT_LIMITS: ModelLimits = {
  inputLimit: 128000,
  outputLimit: 16000,
  contextWindow: 128000,
};

/**
 * Gemini Flash models have a 1M token context window
 */
const GEMINI_LIMITS: ModelLimits = {
  inputLimit: 1048576,
  outputLimit: 65536,
  contextWindow: 1048576,
};

/**
 * Get token limits for a specific model.
 * Falls back to default limits if model not found.
 */
export function getModelLimits(model: string): ModelLimits {
  // Direct match
  if (MODEL_LIMITS[model]) {
    return MODEL_LIMITS[model];
  }

  // Check for variants
  if (model.startsWith("gpt-5")) {
    return MODEL_LIMITS["gpt-5"];
  }

  if (model.startsWith("gemini")) {
    return GEMINI_LIMITS;
  }

  return DEFAULT_LIMITS;
}

/**
 * Check if token usage exceeds the threshold
 */
export function isOverThreshold(
  totalTokens: number,
  contextWindow: number,
  threshold: number = DEFAULT_THRESHOLD,
): boolean {
  return totalTokens > contextWindow * threshold;
}

/**
 * Calculate usage percentage
 */
export function calculateUsagePercentage(
  totalTokens: number,
  contextWindow: number,
): number {
  return (totalTokens / contextWindow) * 100;
}
