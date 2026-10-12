
export interface AgentCallBacks{

  onToken: (token: string) => void;
  onToolCallStart: (name: string, args: unknown) => void;
  onToolCallEnd: (name: string, result: string) => void;
  onComplete: (response: string) => void;
  onToolApproval: (name: string, args: unknown) => Promise<boolean>;
  onTokenUsage?: (usage: TokenUsageInfo) => void;

}

export interface ToolAprovalRequest{
    toolName:String,
    args :unknown,
    resolve:(approved:boolean)=>void
}

export interface ToolCallInfo{
    toolCallId:String,
    toolName:string,
    args:Record<string ,unknown>
}


//tokens limit for context managment 
export interface modelLimit {
    inputLimit:number ,
    outputLimit :number ,
    windowSize:number 
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