import { length } from "zod";
import type { EvalTarget, SingleTurnResult } from "./types.ts";

/**
 * Evaluator: Check if all expected tools were selected.
 * Returns 1 if ALL expected tools are in the output, 0 otherwise.
 * For golden prompts.
 */

export function toolsSelected(
  output: SingleTurnResult,
  target: EvalTarget,
): number {

    if(!target.expectedTools?.length) return 1;

    const selected= new Set(output.toolNames);
    return target.expectedTools.every((t)=>selected.has(t)) ? 1:0;

}

/**
 * Evaluator: Check if forbidden tools were avoided.
 * Returns 1 if NONE of the forbidden tools are in the output, 0 otherwise.
 * For negative prompts.
 */

export function toolsAvoided(
  output: SingleTurnResult,
  target: EvalTarget,
): number {

    if(!target.forbiddenTools?.length) return 1;

    const selected= new Set(output.toolNames);
    return target.forbiddenTools.every((t)=>selected.has(t)) ? 0:1;

} 

/**
 * Evaluator: Precision/recall score for tool selection.
 * Returns a score between 0 and 1 based on correct selections.
 * For secondary prompts.
 */

export function toolsSelectionScoring(
  output: SingleTurnResult,
  target: EvalTarget,
): number {

    if(!target.forbiddenTools?.length){
        return output.selectedAny? 0.5 : 1;
    }

  const expected = new Set(target.expectedTools);
  const selected = new Set(output.toolNames);

  const hits = output.toolNames.filter((t)=> expected.has(t)).length;
  const precision= selected.size>0 ? hits/selected.size:0; 
  const recall= expected.size>0 ? hits/expected.size:0;


  // F1 -score;
  if(precision+recall===0) return 0;
  
  return (2*precision/recall)/(precision+recall);


} 