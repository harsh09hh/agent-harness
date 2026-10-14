import React from "react";
import { Box, Text } from "ink";
import { marked, type Token, type Tokens } from "marked";
import stringWidth from "string-width";

interface MarkdownProps {
  text: string;
  // columns available for the rendered text
  width: number;
}

// Keycap emoji (1️⃣ 2️⃣ #️⃣) show up as coloured blocks in many terminals and
// are measured at the wrong width, so they are turned back into plain characters
const KEYCAP = /([0-9#*])️?⃣/g;

// A table column must be wide enough for its longest word (within these limits),
// otherwise the table is shown as a stacked list instead of chopping words apart
const MIN_COLUMN_WIDTH = 8;
const MAX_REQUIRED_COLUMN_WIDTH = 16;

// ---------- inline (bold, code, links, ...) ----------

function renderInline(tokens: Token[] | undefined, key: string): React.ReactNode[] {
  return (tokens ?? []).map((token, index) => {
    const k = `${key}.${index}`;
    switch (token.type) {
      case "strong":
        return (
          <Text key={k} bold>
            {renderInline((token as Tokens.Strong).tokens, k)}
          </Text>
        );
      case "em":
        return (
          <Text key={k} italic>
            {renderInline((token as Tokens.Em).tokens, k)}
          </Text>
        );
      case "del":
        return (
          <Text key={k} strikethrough>
            {renderInline((token as Tokens.Del).tokens, k)}
          </Text>
        );
      case "codespan":
        return (
          <Text key={k} color="yellow">
            {(token as Tokens.Codespan).text}
          </Text>
        );
      case "link": {
        const link = token as Tokens.Link;
        const label = renderInline(link.tokens, k);
        return (
          <Text key={k}>
            <Text color="cyan" underline>
              {label}
            </Text>
            {link.text !== link.href && <Text dimColor> ({link.href})</Text>}
          </Text>
        );
      }
      case "image":
        return (
          <Text key={k} dimColor>
            [image: {(token as Tokens.Image).text}]
          </Text>
        );
      case "checkbox":
        return (
          <Text key={k} color="cyan">
            {(token as Tokens.Checkbox).checked ? "[x] " : "[ ] "}
          </Text>
        );
      case "br":
        return "\n";
      case "text": {
        const text = token as Tokens.Text;
        return text.tokens ? (
          <Text key={k}>{renderInline(text.tokens, k)}</Text>
        ) : (
          text.text
        );
      }
      default:
        return "text" in token && typeof token.text === "string" ? token.text : token.raw;
    }
  });
}

// plain text of a piece of markdown, used to measure table columns
function plainText(tokens: Token[] | undefined): string {
  return (tokens ?? [])
    .map((token) => {
      if ("tokens" in token && Array.isArray(token.tokens) && token.type !== "codespan") {
        return plainText(token.tokens);
      }
      if (token.type === "checkbox") return (token as Tokens.Checkbox).checked ? "[x] " : "[ ] ";
      return "text" in token && typeof token.text === "string" ? token.text : token.raw;
    })
    .join("");
}

// ---------- tables ----------

// Share the available width between columns. Each column first gets its minimum,
// then the rest is handed out evenly to columns that still want more.
// Returns null if the minimums alone do not fit.
function fitColumns(natural: number[], minimum: number[], available: number): number[] | null {
  if (natural.reduce((sum, w) => sum + w, 0) <= available) return natural;
  const widths = [...minimum];
  let remaining = available - widths.reduce((sum, w) => sum + w, 0);
  if (remaining < 0) return null;

  while (remaining > 0) {
    const growing = widths.map((w, i) => i).filter((i) => widths[i] < natural[i]);
    if (growing.length === 0) break;
    const share = Math.max(1, Math.floor(remaining / growing.length));
    for (const i of growing) {
      const add = Math.min(share, natural[i] - widths[i], remaining);
      widths[i] += add;
      remaining -= add;
      if (remaining === 0) break;
    }
  }
  return widths;
}

function Table({ token, width }: { token: Tokens.Table; width: number }) {
  const count = token.header.length;
  const cellText = (cell: Tokens.TableCell | undefined) => plainText(cell?.tokens);
  const columnTexts = token.header.map((header, i) => [
    cellText(header),
    ...token.rows.map((row) => cellText(row[i])),
  ]);
  // +2 for the space on each side of a cell
  const natural = columnTexts.map((texts) => Math.max(...texts.map((t) => stringWidth(t))) + 2);
  const minimum = columnTexts.map((texts, i) => {
    const longestWord = Math.max(...texts.flatMap((t) => t.split(/\s+/)).map((w) => stringWidth(w)));
    const needed = Math.min(MAX_REQUIRED_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, longestWord + 2));
    return Math.min(natural[i], needed);
  });
  // outer border (2) and a separator between each pair of columns
  const widths = fitColumns(natural, minimum, width - 2 - (count - 1));

  // too narrow for columns: show each row as "header: value" lines
  if (!widths) {
    return (
      <Box flexDirection="column">
        {token.rows.map((row, r) => (
          <Box key={r} flexDirection="column">
            {r > 0 && <Text dimColor>{"─".repeat(Math.max(1, Math.min(width, 20)))}</Text>}
            {token.header.map((header, i) => (
              <Text key={i}>
                <Text bold>{renderInline(header.tokens, `h${i}`)}: </Text>
                {renderInline(row[i]?.tokens, `r${r}.${i}`)}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    );
  }

  const renderRow = (cells: Tokens.TableCell[], key: string, isHeader: boolean) => (
    <Box
      key={key}
      borderStyle="single"
      borderColor="gray"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderBottom={isHeader}
    >
      {widths.map((columnWidth, i) => {
        const isLast = i === count - 1;
        return (
          <Box
            key={i}
            width={columnWidth + (isLast ? 0 : 1)}
            paddingX={1}
            borderStyle="single"
            borderColor="gray"
            borderTop={false}
            borderBottom={false}
            borderLeft={false}
            borderRight={!isLast}
          >
            <Text bold={isHeader}>{renderInline(cells[i]?.tokens, `${key}.${i}`)}</Text>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" alignSelf="flex-start">
      {renderRow(token.header, "header", true)}
      {token.rows.map((row, r) => renderRow(row, `row${r}`, false))}
    </Box>
  );
}

// ---------- blocks (paragraphs, lists, code, ...) ----------

function Blocks({ tokens, width, gap = 1 }: { tokens: Token[]; width: number; gap?: number }) {
  const blocks = tokens.filter((token) => token.type !== "space" && token.type !== "def");
  return (
    <Box flexDirection="column" gap={gap}>
      {blocks.map((token, index) => (
        <Block key={index} token={token} width={width} />
      ))}
    </Box>
  );
}

function Block({ token, width }: { token: Token; width: number }) {
  switch (token.type) {
    case "heading": {
      const heading = token as Tokens.Heading;
      return (
        <Text bold color={heading.depth <= 2 ? "magenta" : undefined} underline={heading.depth === 1}>
          {renderInline(heading.tokens, "h")}
        </Text>
      );
    }
    case "paragraph":
      return <Text>{renderInline((token as Tokens.Paragraph).tokens, "p")}</Text>;
    case "text": {
      const text = token as Tokens.Text;
      return <Text>{text.tokens ? renderInline(text.tokens, "t") : text.text}</Text>;
    }
    case "code": {
      const code = token as Tokens.Code;
      return (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          {code.lang && <Text dimColor>{code.lang}</Text>}
          <Text>{code.text}</Text>
        </Box>
      );
    }
    case "blockquote":
      return (
        <Box
          borderStyle="bold"
          borderColor="gray"
          borderTop={false}
          borderRight={false}
          borderBottom={false}
          paddingLeft={1}
        >
          <Blocks tokens={(token as Tokens.Blockquote).tokens} width={width - 2} />
        </Box>
      );
    case "hr":
      return <Text dimColor>{"─".repeat(Math.max(1, width))}</Text>;
    case "list": {
      const list = token as Tokens.List;
      const first = typeof list.start === "number" ? list.start : 1;
      return (
        <Box flexDirection="column" gap={list.loose ? 1 : 0}>
          {list.items.map((item, index) => {
            // a task item starts with a checkbox token; show it next to the bullet
            const [firstToken, ...rest] = item.tokens;
            const checkbox = firstToken?.type === "checkbox" ? (firstToken as Tokens.Checkbox) : null;
            const bullet = list.ordered ? `${first + index}.` : "•";
            const marker = checkbox ? `${bullet} [${checkbox.checked ? "x" : " "}]` : bullet;
            return (
              <Box key={index}>
                <Box flexShrink={0} width={marker.length + 1}>
                  <Text color="cyan">{marker}</Text>
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  <Blocks tokens={checkbox ? rest : item.tokens} width={width - marker.length - 1} gap={0} />
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    }
    case "table":
      return <Table token={token as Tokens.Table} width={width} />;
    default:
      return <Text>{"text" in token && typeof token.text === "string" ? token.text : token.raw}</Text>;
  }
}

// Renders a markdown answer from the model for the terminal
export function Markdown({ text, width }: MarkdownProps) {
  const source = text.replace(KEYCAP, "$1");
  let tokens: Token[];
  try {
    tokens = marked.lexer(source);
  } catch {
    return <Text>{source}</Text>;
  }
  return <Blocks tokens={tokens} width={Math.max(10, width)} />;
}
