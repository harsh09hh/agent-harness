import type { ModelMessage } from "ai";

// provide can return format that causes issue when sent back



export const filterCompatibleMessages=(
  messages: ModelMessage[],
): ModelMessage[] => {

    return messages.filter((msg)=>{
        //keeping the user and the system message

        if(msg.role==="user"||msg.role==="system"){
            return true;
        }


        //keeping assistant meggage that have text info
        if(msg.role=="assistant"){
            const content = msg.content;
            if (typeof content === "string" && content.trim()) {
                return true;
            }

             // Check for array content with text parts
      if (Array.isArray(content)) {
        const hasTextContent = content.some((part: unknown) => {
          if (typeof part === "string" && part.trim()) return true;
          if (typeof part === "object" && part !== null && "text" in part) {
            const textPart = part as { text?: string };
            return textPart.text && textPart.text.trim();
          }
          // keep tool calls too, so the tool results that follow still have their call
          if (typeof part === "object" && part !== null && "type" in part) {
            return (part as { type?: string }).type === "tool-call";
          }
          return false;
        });
        return hasTextContent;
      }
    }

    // Keep tool messages
    if (msg.role === "tool") {
      return true;
    }

    return false;
  });
};