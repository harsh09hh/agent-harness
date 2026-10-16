import path from "path";

// Read-only tools run without asking. Anything not listed here (write, delete,
// run code, and any tool added later) asks for approval first.
// spawnAgent only starts read-only sub-agents, so it does not ask either.
const NO_APPROVAL_TOOLS = new Set(["readFile", "listFiles", "spawnAgent"]);

export function needsApproval(toolName: string, args: Record<string, unknown>): boolean {
  if (!NO_APPROVAL_TOOLS.has(toolName)) return true;

  // reading a secrets file (.env, .env.local, ...) is not a basic read
  if (toolName === "readFile" && typeof args.path === "string") {
    return path.basename(args.path).toLowerCase().startsWith(".env");
  }

  return false;
}
