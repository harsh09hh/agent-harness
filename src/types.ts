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


// traking  the total token usage
export interface TokenUsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextWindow: number;
  threshold: number;
  percentage: number;
}