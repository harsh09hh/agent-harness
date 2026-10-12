import { readFile, listFiles } from "./file.ts";

// All tools combined for the agent
export const tools = {
  readFile,
  listFiles,
};

// Export individual tools for selective use in evals
export { readFile, listFiles } from "./file.ts";

// Tool sets for evals
export const fileTools = {
  readFile,
  listFiles,
};
