import * as dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline/promises'
import { persistHistory } from './utils/persistHistory.ts'
import { runBash } from './utils/runBash.ts'

dotenv.config({quiet:true})

const client = new Anthropic({
    baseURL:process.env.ANTHROPIC_BASE_URL,
    apiKey:process.env.ANTHROPIC_API_KEY
})
const MODEL = process.env.MODEL_ID!;
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;
const DEBUG = process.argv.includes('--debug') || ['1', 'true'].includes(process.env.DEBUG?.toLowerCase() ?? '');

const history:Anthropic.MessageParam[] = [];

function persistAndExit(exitCode: number): never {
    persistHistory(history);
    rl.close();
    process.exit(exitCode);
}

const rl = readline.createInterface({input:process.stdin,output:process.stdout});

process.once('SIGINT', () => persistAndExit(130));
process.once('uncaughtException', (error) => {
    console.error(error);
    persistAndExit(1);
});
process.once('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    persistAndExit(1);
});


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
    persistHistory(history);
    //agent loop
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
        persistHistory(history);

        let execRes = "";
        //rsp includes tool use
        for(const block of content){
            if(block.type === 'thinking'){
                console.log(`\x1b[34mthinking : ${block.thinking}\x1b[0m`);
                continue;
            }
            if(block.type!=='tool_use'){
                continue;
            }

            if(block.name === 'bash'){
                let input = block.input as {command:string};
                console.log(`\x1b[38;5;208mtool use : ${block.name} ${JSON.stringify(input)}\x1b[0m`);
                let res = await runBash(input.command);
                console.log(`\x1b[33m${res}\x1b[0m`);

                execRes += res + "\n";
            }

        }
        if(rsp.stop_reason!=='tool_use'){
            break;
        }
        history.push({content:execRes,role:'user'});
        persistHistory(history);
        if(DEBUG){
            console.log("rsp")
            console.dir(rsp, {depth:null, maxArrayLength:null, maxStringLength:null});
        }
    }
    const content = history[history.length-1]?.content;
    if(Array.isArray(content)){
        let output = content.filter((blk)=>blk.type === 'text').map(blk=>blk.text).join(" ").trim();
        console.log(output);
    }
}
persistHistory(history);
rl.close();
