import {exec} from "node:child_process"
import * as dotenv from 'dotenv'
import Anthropic from '@anthropic-ai/sdk'

dotenv.config()

const client = new Anthropic({
    baseURL:process.env.baseURL,
    apiKey:process.env.apiKey
})
const MODEL = process.env.MODEL_ID!;
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;
