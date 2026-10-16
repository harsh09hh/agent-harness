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
            
            return items.length>0 ? items.join("\n") : `Directory ${directory} is empty`;
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

/**
 * Write content to a file
 */
export const writeFile = tool({
  description:
    "Write content to a file at the specified path. Creates the file if it doesn't exist, overwrites if it does. For small changes to an existing file use editFile instead.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to write"),
    content: z.string().describe("The content to write to the file"),
  }),
  execute: async ({
    path: filePath,
    content,
  }: {
    path: string;
    content: string;
  }) => {
    try {
      // Create parent directories if they don't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(filePath, content, "utf-8");
      return `Successfully wrote ${content.length} characters to ${filePath}`;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      return `Error writing file: ${err.message}`;
    }
  },
});


/**
 * Find and replace an exact snippet in a file
 */
export const editFile = tool({
  description:
    "Edit an existing file by replacing an exact snippet of text. Use this for small changes instead of rewriting the whole file with writeFile. oldText must match the file exactly (including spaces and indentation) and appear only once - include a few surrounding lines to make it unique, or set replaceAll to change every occurrence. Read the file first so you copy the text exactly.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to edit"),
    oldText: z.string().describe("The exact text to find in the file"),
    newText: z.string().describe("The text to put in its place"),
    replaceAll: z
      .boolean()
      .default(false)
      .describe("Replace every occurrence instead of requiring exactly one"),
  }),
  execute: async ({
    path: filePath,
    oldText,
    newText,
    replaceAll = false,
  }: {
    path: string;
    oldText: string;
    newText: string;
    replaceAll?: boolean;
  }) => {
    if (oldText === "") {
      return "Error: oldText is empty. Use writeFile to create a new file.";
    }
    if (oldText === newText) {
      return "Error: oldText and newText are the same, nothing to change.";
    }

    try {
      const content = await fs.readFile(filePath, "utf-8");

      // models send \n line endings; in a file that uses \r\n, match and write \r\n
      const toFileEndings = (text: string) =>
        content.includes("\r\n") ? text.replace(/\r?\n/g, "\r\n") : text;
      const find = toFileEndings(oldText);
      const replacement = toFileEndings(newText);

      const count = content.split(find).length - 1;
      if (count === 0) {
        return `Error: oldText was not found in ${filePath}. Read the file and copy the text exactly, including indentation.`;
      }
      if (count > 1 && !replaceAll) {
        return `Error: oldText appears ${count} times in ${filePath}. Add surrounding lines so it matches only once, or set replaceAll to true.`;
      }

      // split/join instead of String.replace so "$" in newText is not treated as a pattern
      const updated = content.split(find).join(replacement);
      await fs.writeFile(filePath, updated, "utf-8");
      return `Successfully replaced ${count} occurrence${count === 1 ? "" : "s"} in ${filePath}`;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return `Error: File not found: ${filePath}`;
      }
      return `Error editing file: ${err.message}`;
    }
  },
});


/**
 * Delete a file
 */
export const deleteFile = tool({
  description:
    "Delete a file at the specified path. Use with caution as this is irreversible.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to delete"),
  }),
  execute: async ({ path: filePath }: { path: string }) => {
    try {
      await fs.unlink(filePath);
      return `Successfully deleted ${filePath}`;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return `Error: File not found: ${filePath}`;
      }
      return `Error deleting file: ${err.message}`;
    }
  },
});