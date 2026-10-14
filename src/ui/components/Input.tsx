import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface InputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  // called when "+" is pressed while the input is empty (opens the folder picker)
  onPlus?: () => void;
  // called when Tab is pressed while the input is empty (opens the model picker)
  onTab?: () => void;
}

export function Input({ onSubmit, disabled = false, onPlus, onTab }: InputProps) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (disabled) return;

    if (key.return) {
      if (value.trim()) {
        onSubmit(value);
        setValue('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
      return;
    }

    if (key.tab) {
      if (value === '') onTab?.();
      return;
    }

    if (input === '+' && value === '' && onPlus) {
      onPlus();
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setValue((prev) => prev + input);
    }
  });

  return (
    <Box borderStyle="round" borderColor={disabled ? 'gray' : 'blue'} paddingX={1}>
      <Text color="blue" bold>
        {'> '}
      </Text>
      <Text>{value}</Text>
      {!disabled && <Text color="gray">▌</Text>}
    </Box>
  );
}
