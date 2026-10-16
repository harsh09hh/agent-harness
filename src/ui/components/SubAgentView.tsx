import React from "react";
import { Box, Text } from "ink";
import InkSpinner from "ink-spinner";
import type { SubAgentUpdate } from "../../types.ts";

// One sub-agent started with spawnAgent: what it is doing now, or what it reported
export function SubAgentView({ agent }: { agent: SubAgentUpdate }) {
  return (
    <Box flexDirection="column" marginLeft={2}>
      <Text>
        <Text color="magenta" bold>
          ⇢ sub-agent{" "}
        </Text>
        <Text>{agent.description} </Text>
        {agent.status === "running" ? (
          <Text color="cyan">
            <InkSpinner type="dots" />
          </Text>
        ) : agent.status === "done" ? (
          <Text color="green">✓</Text>
        ) : (
          <Text color="red">✗</Text>
        )}
        <Text dimColor> step {agent.step}</Text>
      </Text>
      {agent.status === "running" && agent.currentTool && (
        <Box marginLeft={2}>
          <Text dimColor>↳ {agent.currentTool}</Text>
        </Box>
      )}
      {agent.status !== "running" && agent.result && (
        <Box marginLeft={2}>
          <Text dimColor>
            → {agent.result.slice(0, 100)}
            {agent.result.length > 100 ? "..." : ""}
          </Text>
        </Box>
      )}
    </Box>
  );
}
