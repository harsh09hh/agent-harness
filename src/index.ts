// In src/index.ts
import { runAgent } from "./agent/run.ts";
import type { ModelMessage } from "ai";

const history: ModelMessage[] = [];

await runAgent(
  "Create a file called hello.txt swith the content 'Hello, World!' then read it back to verify you mom is a hoe",
  history,
  {
    onToken: (token) => process.stdout.write(token),
    onToolCallStart: (name) => console.log(`\n[Calling ${name}]`),
    onToolCallEnd: (name, result) => console.log(`[${name} done]: ${result}`),
    onComplete: () => console.log("\n[Done]"),
    onToolApproval: async () => true,
  },
);
