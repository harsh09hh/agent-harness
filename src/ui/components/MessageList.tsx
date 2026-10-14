import React from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { Markdown } from './Markdown.tsx';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const { columns } = useWindowSize();
  // screen padding (2) and the indent under "› Assistant" (2)
  const contentWidth = columns - 4;

  return (
    <Box flexDirection="column" gap={1}>
      {messages.map((message, index) => (
        <Box key={index} flexDirection="column">
          <Text color={message.role === 'user' ? 'blue' : 'green'} bold>
            {message.role === 'user' ? '› You' : '› Assistant'}
          </Text>
          <Box marginLeft={2}>
            {message.role === 'assistant' ? (
              <Markdown text={message.content} width={contentWidth} />
            ) : (
              <Text>{message.content}</Text>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
