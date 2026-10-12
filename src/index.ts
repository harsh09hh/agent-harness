import {generateText} from "ai";
import { openai } from "@ai-sdk/openai";


const result = await generateText({
            model:openai('gpt-3.5-turbo'),
            prompt:"you are a chat bot"
}) 