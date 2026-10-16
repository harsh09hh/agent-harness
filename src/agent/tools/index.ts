import { readFile, listFiles,writeFile, editFile, deleteFile } from "./file.ts";
import { webSearch } from "./webSearch.ts";
import { executeCode } from "./codeExecution.ts";
import { runCommand } from "./shell.ts";

// All tools combined for the agent
export const tools = {
  readFile,
  listFiles,
  writeFile,
  editFile,
  deleteFile,
  webSearch,
  executeCode

};

// Export individual tools for selective use in evals
export { readFile, writeFile, editFile, listFiles, deleteFile } from "./file.ts";
export { runCommand } from "./shell.ts";
export { executeCode } from "./codeExecution.ts";
export { webSearch } from "./webSearch.ts";

// Tool sets for evals
export const fileTools = {
  readFile,
  listFiles,
  writeFile,
  editFile,
  deleteFile,
  webSearch,
  executeCode
};

export const shellTools = {
  runCommand,
};
