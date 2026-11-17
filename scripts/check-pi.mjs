/** Verify Pi discovers the installed /archray prompts and skill without running a model. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const probe = spawnSync(process.env.PI_BIN || 'pi', ['--version'], { encoding: 'utf8' });
if (probe.error) {
  console.log('pi not found; skipping host check');
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'archray-pi-'));
const cli = resolve('cli/bin/archray.mjs');
let child;
try {
  const init = spawnSync(process.execPath, [cli, 'init', '--target', dir, '--agent', 'pi'], { encoding: 'utf8' });
  if (init.status !== 0) throw new Error(init.stderr || init.stdout);

  child = spawn(process.env.PI_BIN || 'pi', ['--mode', 'rpc', '--no-session', '--approve'], {
    cwd: dir, stdio: ['pipe', 'pipe', 'inherit'],
  });
  const commands = await new Promise((resolveCommands, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('timed out waiting for Pi get_commands')), 15000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      for (const line of buffer.split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'response' && msg.command === 'get_commands') {
            clearTimeout(timer);
            resolveCommands(msg.data.commands);
          }
        } catch {}
      }
    });
    child.once('error', reject);
    child.stdin.write(JSON.stringify({ id: '1', type: 'get_commands' }) + '\n');
  });

  const names = new Set(commands.map((command) => command.name));
  for (const name of ['archray', 'archray-backend', 'archray-data', 'archray-frontend', 'archray-full', 'archray-network', 'archray-security', 'skill:archray']) {
    if (!names.has(name)) throw new Error(`Pi did not discover ${name}`);
  }
  console.log(`Pi host check passed (${commands.filter((c) => c.name.startsWith('archray') || c.name === 'skill:archray').length} commands)`);
} finally {
  child?.kill();
  rmSync(dir, { recursive: true, force: true });
}
