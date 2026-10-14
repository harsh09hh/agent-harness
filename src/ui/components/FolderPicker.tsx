import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import fs from "fs";
import path from "path";

interface FolderPickerProps {
  startPath: string;
  onSelect: (folder: string) => void;
  onCancel: () => void;
}

const MAX_VISIBLE = 8;
const USE_THIS = "[ Use this folder ]";
const PARENT = "..";

// sub-folders of a directory, or an error message if it cannot be read
function readFolders(dir: string): { folders: string[]; error?: string } {
  try {
    const folders = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    return { folders };
  } catch (error) {
    return { folders: [], error: (error as Error).message };
  }
}

export function FolderPicker({ startPath, onSelect, onCancel }: FolderPickerProps) {
  const [current, setCurrent] = useState(startPath);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { folders, error } = useMemo(() => readFolders(current), [current]);
  const parent = path.dirname(current);
  const hasParent = parent !== current;
  const items = [USE_THIS, ...(hasParent ? [PARENT] : []), ...folders];

  const open = (folder: string) => {
    setCurrent(folder);
    setSelectedIndex(0);
  };

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
      return;
    }

    // left / backspace: go up one folder
    if ((key.leftArrow || key.backspace || key.delete) && hasParent) {
      open(parent);
      return;
    }

    if (key.return || key.rightArrow) {
      const item = items[selectedIndex];
      if (item === USE_THIS) {
        // right arrow only moves into folders, Enter confirms
        if (key.return) onSelect(current);
        return;
      }
      open(item === PARENT ? parent : path.join(current, item));
    }
  });

  // show a window of items around the selected one
  const start = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(MAX_VISIBLE / 2), items.length - MAX_VISIBLE),
  );
  const visible = items.slice(start, start + MAX_VISIBLE);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text>
        <Text color="cyan" bold>
          Choose a folder{" "}
        </Text>
        <Text wrap="truncate-start">{current}</Text>
      </Text>

      {error && <Text color="red">Cannot read this folder: {error}</Text>}

      {start > 0 && <Text dimColor>  ↑ {start} more</Text>}
      {visible.map((item, index) => {
        const isSelected = start + index === selectedIndex;
        const label = item === USE_THIS || item === PARENT ? item : `${item}/`;
        return (
          <Text key={item} color={isSelected ? "green" : undefined} bold={isSelected}>
            {isSelected ? "› " : "  "}
            {label}
          </Text>
        );
      })}
      {start + MAX_VISIBLE < items.length && (
        <Text dimColor>  ↓ {items.length - start - MAX_VISIBLE} more</Text>
      )}

      <Text dimColor>↑↓ move · Enter open / select · ← up one folder · Esc cancel</Text>
    </Box>
  );
}
