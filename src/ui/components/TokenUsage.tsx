import React from "react";
import { Text } from "ink";
import type { TokenUsageInfo } from "../../types.ts";

interface TokenUsageProps {
  usage: TokenUsageInfo | null;
  // leave out the (used/window) counts when space is tight
  compact?: boolean;
}

function formatCount(count: number): string {
  return count >= 1000
    ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : String(count);
}

// Compact one-line token display for the status bar
export function TokenUsage({ usage, compact = false }: TokenUsageProps) {
  if (!usage) {
    return <Text dimColor>tokens 0%</Text>;
  }

  const thresholdPercent = Math.round(usage.threshold * 100);
  const usagePercent = usage.percentage.toFixed(1);

  // Determine color based on usage
  let color: string = "green";
  if (usage.percentage >= usage.threshold * 100) {
    color = "red";
  } else if (usage.percentage >= usage.threshold * 100 * 0.75) {
    color = "yellow";
  }

  return (
    <Text>
      <Text dimColor>tokens </Text>
      <Text color={color} bold>
        {usagePercent}%
      </Text>
      <Text dimColor>
        {compact
          ? ""
          : ` (${formatCount(usage.totalTokens)}/${formatCount(usage.contextWindow)})`}
        {" "}
        · threshold {thresholdPercent}%
      </Text>
    </Text>
  );
}
