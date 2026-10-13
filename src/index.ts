import {generateText} from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";


const result = await generateText({
            // model:openai('gpt-3.5-turbo'),
            model:google('gemini-3.6-flash'),
            prompt:"you are a chat bot"
}) 