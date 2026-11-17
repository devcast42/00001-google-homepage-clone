import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID, createHash } from 'node:crypto';
import os from 'node:os';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';

const run = promisify(exec);
const config = JSON.parse(await fs.promises.readFile('config.json', 'utf8'));

async function fetchWithRetry(url, attempts = 3) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (error) {
    if (attempts > 1) {
      await sleep(1000);
      return fetchWithRetry(url, attempts - 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const id = randomUUID();
const digest = createHash('sha256').update(id).digest('hex');
console.log(os.cpus().length, os.platform(), digest);
const { stdout } = await run('git rev-parse HEAD');
fs.writeFileSync('build-id.txt', stdout.trim());
