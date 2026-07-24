import { exec, type ExecException } from 'node:child_process';

const execAsync = (command: string) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err as ExecException);
        return;
      }

      resolve({ stdout, stderr });
    });
  });

export async function runBash(command: string): Promise<string> {
  const dangerous = ['rm', 'shutdown'];
  if (dangerous.some((item) => command.includes(item))) {
    return 'dangerous command denied';
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    return stdout + '\n' + stderr;
  } catch (error) {
    const execError = error as ExecException;
    if (execError.killed && execError.signal === 'SIGTERM') return 'Error: Timeout (120s)';

    const output = ((execError.stdout?.toString() ?? '') + (execError.stderr?.toString() ?? '')).trim();
    return output ? output.slice(0, 50_000) : `Error: ${execError.message}`;
  }
}
