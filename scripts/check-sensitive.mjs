/**
 * Pre-release scan for personal paths, credentials and session traces.
 * Usage: node scripts/check-sensitive.mjs [--strict]
 * Exits 1 only with --strict; without it, prints findings for review.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const strict = process.argv.includes('--strict');
const files = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).stdout.split('\0').filter(Boolean);
const skip = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip|gz)$/i;

const RULES = [
  { name: 'home path', re: /\/Users\/[A-Za-z0-9._-]+/g },
  { name: 'windows home', re: /[A-Z]:\\\\Users\\\\[^\\\s]+/g },
  { name: 'api key', re: /\b(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g },
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'session session url', re: /session:\/\/session\/[0-9a-f-]{8,}/g },
  { name: 'session id field', re: /\b(?:session_id|bot_id)["']?\s*[:=]\s*["'][0-9a-f-]{20,}["']/gi },
  { name: 'local preview', re: /\b127\.0\.0\.1:\d{2,5}\b|\blocalhost:(?!5173)\d{2,5}\b/g },
];

const findings = [];
for (const file of files) {
  if (skip.test(file)) continue;
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = text.split('\n');
  for (const [i, line] of lines.entries()) {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      if (rule.re.test(line)) findings.push({ file, line: i + 1, rule: rule.name, text: line.trim().slice(0, 160) });
    }
  }
}

if (!findings.length) {
  console.log('No sensitive patterns found in tracked files.');
} else {
  for (const f of findings) console.log(`${f.file}:${f.line}  [${f.rule}]  ${f.text}`);
  console.log(`\n${findings.length} finding(s). Review before publishing.`);
}
if (strict && findings.length) process.exit(1);
