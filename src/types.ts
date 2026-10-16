
export interface AgentCallbacks{

  onToken: (token: string) => void;
  onToolCallStart: (name: string, args: unknown, toolCallId: string) => void;
  onToolCallEnd: (name: string, result: string, toolCallId: string) => void;
  onComplete: (response: string) => void;
  onToolApproval: (name: string, args: unknown) => Promise<boolean>;
  onTokenUsage?: (usage: TokenUsageInfo) => void;
  // progress of sub-agents started with spawnAgent
  onSubAgentUpdate?: (update: SubAgentUpdate) => void;

}

// one sub-agent's progress, shown in the UI while it works
export interface SubAgentUpdate {
  id: string; // the spawnAgent tool call id
  description: string;
  status: "running" | "done" | "failed";
  step: number;
  currentTool?: string; // the tool it is running right now
  result?: string;
}

export interface ToolApprovalRequest{
    toolName:string,
    args :unknown,
    resolve:(approved:boolean)=>void
}

export interface ToolCallInfo{
    toolCallId:string,
    toolName:string,
    args:Record<string ,unknown>
}


//tokens limit for context managment 
export interface ModelLimits {
    inputLimit:number ,
    outputLimit :number ,
    contextWindow:number
}


// current token usage for display
export interface TokenUsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextWindow: number;
  threshold: number;
  percentage: number;
}