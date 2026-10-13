import { groq } from "@ai-sdk/groq";

/**
 * Groq native browser search tool
 *
 * This is a provider tool - execution is handled by Groq, not our tool executor.
 */
export const webSearch = groq.tools.browserSearch({});