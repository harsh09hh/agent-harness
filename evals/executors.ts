import { generateText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";

import { SYSTEM_PROMPT } from "../src/agent/system/prompts.ts";
import type { EvalData, SingleTurnResult } from "./types.ts";
import { buildMessages } from "./utils.ts";






export async function singleTurnExecutor(
    data: EvalData,
    availableTools:ToolSet,

):Promise<SingleTurnResult>{

    const messages = buildMessages(data);
    // finter to only tools specified in the data
    const tools: ToolSet = {};

    for(const toolName of data .tools){
        if(availableTools[toolName]){
            tools[toolName]=availableTools[toolName];
        }

    }

    const result  = await generateText({
        model:openai('gpt-4.1'),
        messages,
        tools,
        stopWhen: stepCountIs(1) ,
        temperature: data.config?.temperature ?? undefined,
    });

    //extracting tool calls from the result
    const toolCalls = (result.toolCalls?? []).map((tc)=>({
        toolName:tc.toolName,
        args:"input" in tc ? tc.input:{},
    }));

    const toolNames= toolCalls.map((tc)=>tc.toolName);
    return{
        toolCalls,
        toolNames,
        selectedAny:toolNames.length>0,
    }
}