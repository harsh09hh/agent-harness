import React from "react";
import { Box, Text, useWindowSize } from "ink";
import type { TokenUsageInfo } from "../../types.ts";
import { TokenUsage } from "./TokenUsage.tsx";

interface StatusBarProps {
  folder: string;
  model: string;
  usage: TokenUsageInfo | null;
}

// below this width the folder and the model/tokens no longer fit side by side
const SINGLE_LINE_MIN_COLUMNS = 90;

// the model label, with the key that opens the model picker
function ModelLabel({ model }: { model: string }) {
  return (
    <Text>
      <Text color="magenta" bold>
        [tab]
      </Text>
      <Text color="magenta"> {model}</Text>
    </Text>
  );
}

// The line under the input bar: folder button on the left, model and tokens on the right.
// In a narrow terminal the two halves are stacked instead.
export function StatusBar({ folder, model, usage }: StatusBarProps) {
  const { columns } = useWindowSize();
  const narrow = columns < SINGLE_LINE_MIN_COLUMNS;

  // the label keeps its width; only the path is shortened when space is tight
  const folderPart = (
    <Box>
      <Box flexShrink={0}>
        <Text>
          <Text color="cyan" bold>
            [+]
          </Text>
          <Text dimColor> folder </Text>
        </Text>
      </Box>
      <Box flexShrink={1}>
        <Text wrap="truncate-start">{folder}</Text>
      </Box>
    </Box>
  );

  if (narrow) {
    return (
      <Box flexDirection="column" paddingX={1}>
        {folderPart}
        <Text>
          <ModelLabel model={model} />
          <Text dimColor> · </Text>
          <TokenUsage usage={usage} compact />
        </Text>
      </Box>
    );
  }

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box flexShrink={1} marginRight={2}>
        {folderPart}
      </Box>
      <Box flexShrink={0}>
        <ModelLabel model={model} />
        <Text dimColor> · </Text>
        <TokenUsage usage={usage} />
      </Box>
    </Box>
  );
}
