import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { MODELS, missingKey } from "../../agent/models.ts";

interface ModelPickerProps {
  current: string;
  onSelect: (model: string) => void;
  onCancel: () => void;
}

const PROVIDER_LABELS = { groq: "Groq", google: "Gemini" };

export function ModelPicker({ current, onSelect, onCancel }: ModelPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, MODELS.findIndex((m) => m.id === current)),
  );

  useInput((_input, key) => {
    if (key.escape || key.tab) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev === 0 ? MODELS.length - 1 : prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev === MODELS.length - 1 ? 0 : prev + 1));
      return;
    }

    if (key.return) {
      onSelect(MODELS[selectedIndex].id);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
      <Text color="magenta" bold>
        Choose a model
      </Text>

      {MODELS.map((model, index) => {
        const isSelected = index === selectedIndex;
        const missing = missingKey(model.id);
        return (
          <Text key={model.id}>
            <Text color={isSelected ? "green" : undefined} bold={isSelected}>
              {isSelected ? "› " : "  "}
              {model.id}
            </Text>
            <Text dimColor> {PROVIDER_LABELS[model.provider]}</Text>
            {model.id === current && <Text color="magenta"> (current)</Text>}
            {missing && <Text color="yellow"> · needs {missing} in .env</Text>}
          </Text>
        );
      })}

      <Text dimColor>↑↓ move · Enter select · Esc cancel</Text>
    </Box>
  );
}
