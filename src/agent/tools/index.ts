import { readFile, listFiles,writeFile, deleteFile } from "./file.ts";
import { webSearch } from "./webSearch.ts";

// All tools combined for the agent
export const tools = {
  readFile,
  listFiles,
  writeFile,
  deleteFile,
  webSearch

};

// Export individual tools for selective use in evals
export { readFile, listFiles } from "./file.ts";

// Tool sets for evals
export const fileTools = {
  readFile,
  listFiles,
  writeFile,
  deleteFile,
  webSearch
};
