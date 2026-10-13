import { tool } from "ai";
import { z } from "zod";


 // readFile returns a fixed content
export const createMockReadFiles=(mockContent:string)=>{
    return tool({
        description: "Read the contents of a file at the specified path. Use this to examine file contents.",
        inputSchema:z.object({
            path:z.string().describe("the path to read the file"),
        }),
        execute:async({path}:{path:string})=>mockContent,
    })
}



 // writeFile returns a fixed content
export const createMockWriteFile=(mockResponce?:string)=>{
    return tool({
        description: "Write the contents of a file at the specified path. Creates the file it dose not exist",
        inputSchema:z.object({
            path:z.string().describe("the path to read the file"),
            content:z.string().describe("the content to write in the file"),
        }),
        execute:async({path, content}:{path:string, content:string})=>mockResponce ??`Successfully wrote ${content.length} characters to ${path}` ,
    })
}



export const createMockListFiles=(mockFiles:string[])=>{
    return tool({
        description: "List all the files and directories in the specified directory path",
        inputSchema:z.object({
            directory:z.string().describe("The directory path to list contents of").default("."),
        }),
         execute: async ({ directory }: { directory: string }) =>mockFiles.join("\n"),
    })
}


export const createMockDeleteFile = (mockResponse?: string) =>
  tool({
    description:
      "Delete a file at the specified path. Use with caution as this is irreversible.",
    inputSchema: z.object({
      path: z.string().describe("The path to the file to delete"),
    }),
    execute: async ({ path }: { path: string }) =>
      mockResponse ?? `Successfully deleted ${path}`,
  });


export const createMockShell = (mockOutput: string) =>
  tool({
    description:
      "Execute a shell command and return its output. Use this for system operations.",
    inputSchema: z.object({
      command: z.string().describe("The shell command to execute"),
    }),
    execute: async ({ command }: { command: string }) => mockOutput,
  });