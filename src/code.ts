import {exec} from "node:child_process"
import * as dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline/promises'

dotenv.config({quiet:true})

const client = new Anthropic({
    baseURL:process.env.ANTHROPIC_BASE_URL,
    apiKey:process.env.ANTHROPIC_API_KEY
})
const MODEL = process.env.MODEL_ID!;
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;
const DEBUG = process.argv.includes('--debug') || ['1', 'true'].includes(process.env.DEBUG?.toLowerCase() ?? '');

const history:Anthropic.MessageParam[] = [];
const rl = readline.createInterface({input:process.stdin,output:process.stdout});



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
    const rsp:Anthropic.Message = await client.messages.create({
        model:MODEL,
        system:SYSTEM,
        messages:history,
        max_tokens:5000
    });
    let {content} = rsp;
    if(DEBUG){
        console.dir(content, {depth:null, maxArrayLength:null, maxStringLength:null});
    }
    let output = content.filter((blk)=>blk.type === 'text').map(blk=>blk.text).join(" ").trim();
    console.log(output);
}
rl.close();
