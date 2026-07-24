import type Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function makeLogTimestamp(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

const logDirectory = join(process.cwd(), 'logs');
const historyLogPath = join(logDirectory, `log_${makeLogTimestamp()}.log`);
const historyTempLogPath = `${historyLogPath}.${process.pid}.tmp`;

export function persistHistory(history: Anthropic.MessageParam[]): void {
  try {
    mkdirSync(logDirectory, { recursive: true });
    writeFileSync(historyTempLogPath, JSON.stringify(history, null, 2), 'utf8');
    renameSync(historyTempLogPath, historyLogPath);
  } catch (error) {
    console.error(`Failed to persist history to ${historyLogPath}:`, error);
  }
}
