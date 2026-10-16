import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = 'Thinking...' }: SpinnerProps) {
  // seconds since this spinner appeared, so a long wait visibly counts up
  // (give it a key that changes with the label to restart the count)
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text>
      <Text color="cyan">
        <InkSpinner type="dots" />
      </Text>
      {' '}
      <Text dimColor>{label}</Text>
      {seconds >= 2 && <Text dimColor> {seconds}s</Text>}
    </Text>
  );
}
