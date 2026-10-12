import { tool } from "ai";
import z from "zod";
import fs from "fs/promises";
import path from "path";

// read file content
export const readFile= tool({
    description:"Read the contents of the file at the specific path . Use this to examine file contents.",
    inputSchema:z.object({
                        path :z.string().describe("The path to the file to read"),
                        }),
    execute:async({path:filePath}:{path:string})=>{
        try{
            const content = await fs.readFile(filePath, "utf-8");
            return content;
        }
        catch(error){
            const err = error as NodeJS.ErrnoException;
            if(err.code=="ENOENT"){
                return `Error : File not found ${filePath}`;

            }

            return `Error reading file :${err.message}`;
        }
    }
})



//list files in the directory

export const listFiles=tool({
    description: "List all files and directories in the specified directory path.",
    inputSchema:z.object({
                            directory: z.string().describe("The directory path to the list contents of ").default("."),
                        }),

    execute:async({directory}:{directory:string})=>{
        try{
            const entries =await fs.readdir(directory,{withFileTypes:true});
            const items =entries.map((entry)=>{
                const type = entry.isDirectory() ? "[dir]":"[file]";
                return`${type}${entry.name}`;
            });
            
            return items.length>0 ? items.join("/n") : `Directory ${directory} is empty`;
        }
        catch(error){
            const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return `Error: Directory not found: ${directory}`;
      }
      return `Error listing directory: ${err.message}`;
    

        }
    }
})