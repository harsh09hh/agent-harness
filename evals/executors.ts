import { generateText, getToolName, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

import { SYSTEM_PROMPT } from "../src/agent/system/prompts.ts";
import type { EvalData, SingleTurnResult, MultiTurnEvalData, MultiTurnResult } from "./types.ts";
import { buildMessages, buildMockedTools } from "./utils.ts";






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
        // model:openai('gpt-4.1'),
        // model:google('gemini-3.6-flash'),
        model:groq('openai/gpt-oss-120b'),
        messages,
        allowSystemInMessages: true,
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


export async function multiTurnWithMocks(  data: MultiTurnEvalData,
): Promise<MultiTurnResult> {

    const tools =buildMockedTools(data.mockTools);


    // building the message
    const messages: ModelMessage[]=data.messages??[
        {role:"system", content:SYSTEM_PROMPT},
        {role:"user", content:data.prompt!},
    ]

    const result = await generateText({
        // model:google('gemini-3.5-flash-lite'),
        model:groq('openai/gpt-oss-120b'),
        messages,
        allowSystemInMessages: true,
        tools,
        stopWhen:stepCountIs(data.config?.maxSteps??20),
    })

    //extracting all the tool calls in order
    const allToolCalls:string[]=[];
    const steps =result.steps.map((step)=>{
            const stepToolCalls =(step.toolCalls??[]).map((tc)=>{
                    allToolCalls.push(tc.toolName);
                    return{
                        toolName:tc.toolName,
                        args:"input" in tc ? tc.input:{},
                    };
            });
        
          
    const stepToolResults = (step.toolResults ?? []).map((tr) => ({
      toolName: tr.toolName,
      result: "output" in tr ? tr.output : tr,
    }));

    return {
      toolCalls: stepToolCalls.length > 0 ? stepToolCalls : undefined,
      toolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
      text: step.text || undefined,
    };
  });

  // Extract unique tools used
  const toolsUsed = [...new Set(allToolCalls)];

  return {
    text: result.text,
    steps,
    toolsUsed,
    toolCallOrder: allToolCalls,
  };
}