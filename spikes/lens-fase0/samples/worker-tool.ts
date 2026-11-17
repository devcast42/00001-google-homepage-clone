import { spawn } from 'node:child_process';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import * as readline from 'node:readline';
import { EventEmitter } from 'node:events';

const bus = new EventEmitter();
bus.on('line', (line: string) => console.log(line));

if (isMainThread) {
  const child = spawn('ls', ['-la']);
  const rl = readline.createInterface({ input: child.stdout });
  rl.on('line', (line) => bus.emit('line', line));
  child.on('close', (code) => console.log(`exit ${code}`));

  const worker = new Worker(new URL(import.meta.url));
  worker.postMessage(Buffer.from('hello').toString('base64'));
} else {
  parentPort?.on('message', (msg: string) => parentPort?.postMessage(msg.length));
}
