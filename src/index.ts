import { runAgent } from "./agent/run.ts";
import type { ModelMessage } from "ai";

const history: ModelMessage[] = [];

const result = await runAgent(
  "What files are in the current directory? Then read the package.json file.",
  history,
  {
    onToken: (token) => process.stdout.write(token),
    onToolCallStart: (name, args) => {
      console.log(`\n[Tool] ${name}`, JSON.stringify(args));
    },
    onToolCallEnd: (name, result) => {
      console.log(`[Result] ${name}: ${result.slice(0, 100)}...`);
    },
    onComplete: () => console.log("\n[Done]"),
    onToolApproval: async () => true, // Auto-approve for now
  },
);

console.log(`\nTotal messages: ${result.length}`);
