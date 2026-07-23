import {exec, type ExecException} from "node:child_process"
import { promisify } from "node:util"
import * as dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline/promises'
import { stdout } from "node:process"

dotenv.config({quiet:true})
const execAsync = (command: string) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        const execError: ExecException = err;
        reject(execError);
        return;
      }

      resolve({ stdout, stderr });
    });
  });

async function runBash(command:string):Promise<string>{
    const dangerous = ['rm',"shutdown"];
    if(dangerous.some(d=>command.includes(d))){
        return Promise.resolve("dangerous command denied");
    }
    try{
        const {stdout,stderr} = await execAsync(command);
        return stdout + '\n' + stderr;
    } catch (err) {
        const e = err as ExecException;
        if (e.killed && e.signal === "SIGTERM") return "Error: Timeout (120s)";
        // exec 在非零退出码时也 throw, 但 stdout/stderr 挂在 err 上 ——
        // 和 Python subprocess.run(capture_output) 一样, 都要把输出喂给模型。
        const out = ((e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "")).trim();
        return out ? out.slice(0, 50_000) : `Error: ${e.message}`;
    }
}

const client = new Anthropic({
    baseURL:process.env.ANTHROPIC_BASE_URL,
    apiKey:process.env.ANTHROPIC_API_KEY
})
const MODEL = process.env.MODEL_ID!;
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;
const DEBUG = process.argv.includes('--debug') || ['1', 'true'].includes(process.env.DEBUG?.toLowerCase() ?? '');

const history:Anthropic.MessageParam[] = [];
const rl = readline.createInterface({input:process.stdin,output:process.stdout});


const TOOLS:Anthropic.Tool[] = [
    {
        name:"bash",
        input_schema:{
            type:'object',
            properties:{
                command:{type:'string'}
            },
            required:["command"]
        }
    }
]
console.log("welcome to cc-scratch")
const EXIT = ["exit","q"]
while(true){
    let query:string
    try{
    query = await rl.question(">>");
    }catch(err){
        break;
    }
    if(EXIT.includes(query.trim().toLowerCase())){
        break;
    }
    history.push({content:query,role:"user"});
    while(true){
        
        const rsp:Anthropic.Message = await client.messages.create({
            model:MODEL,
            system:SYSTEM,
            messages:history,
            max_tokens:8000,
            tools:TOOLS
        });
        
        let {content} = rsp;
        history.push({role:"assistant",content})
        if(rsp.stop_reason&&rsp.stop_reason!=='tool_use'){
            break;
        }
        if(DEBUG){
            console.dir(rsp, {depth:null, maxArrayLength:null, maxStringLength:null});
        }
        let output = content.filter((blk)=>blk.type === 'text').map(blk=>blk.text).join(" ").trim();
        console.log(output);
    }
}
rl.close();
