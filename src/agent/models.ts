import type { LanguageModel } from "ai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";

export type Provider = "groq" | "google";

export interface ModelOption {
  id: string;
  provider: Provider;
}

// the models the user can pick from the UI (press Tab)
export const MODELS: ModelOption[] = [
  { id: "openai/gpt-oss-120b", provider: "groq" },
  { id: "openai/gpt-oss-20b", provider: "groq" },
  { id: "qwen/qwen3.8-27b", provider: "groq" },
  { id: "gemini-3.6-flash", provider: "google" },
  { id: "gemini-3.5-flash", provider: "google" },
];

export const DEFAULT_MODEL = "openai/gpt-oss-120b";

// sub-agents use a smaller model with its own Groq rate limits, so they do not
// use up the main model's per-minute token budget
export const SUBAGENT_MODEL = "openai/gpt-oss-20b";

// the .env variable each provider reads its key from
export const PROVIDER_KEYS: Record<Provider, string> = {
  groq: "GROQ_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export function findModel(id: string): ModelOption {
  return MODELS.find((m) => m.id === id) ?? { id, provider: "groq" };
}

// the env variable that is missing for this model, or null if its key is set
export function missingKey(id: string): string | null {
  const name = PROVIDER_KEYS[findModel(id).provider];
  return process.env[name] ? null : name;
}

export function getModel(id: string): LanguageModel {
  const { provider } = findModel(id);
  return provider === "google" ? google(id) : groq(id);
}
