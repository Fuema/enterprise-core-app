// Scans the STAGED changes for secrets before a commit:  npm run check:secrets
// Exit code 0 = clean, 1 = findings (the commit must not proceed).
//
// 1. Blocked file names (env files with real values, keys, certificates).
// 2. Secret-looking content in the staged version of every added/modified file.
// Cross-platform (Node only), no dependencies.
import { execFileSync } from 'node:child_process';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });

/** Env files that may be committed: documentation and non-secret localhost defaults only. */
const ALLOWED_ENV_FILES = new Set(['.env.example', '.env.development']);

const BLOCKED_NAMES = [
  { pattern: /(^|\/)\.env(\.[^/]+)?$/, reason: 'environment file (only .env.example and .env.development may be committed)' },
  { pattern: /\.(pem|key|pfx|p12|jks|keystore)$/i, reason: 'private key or certificate store' },
  { pattern: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/, reason: 'SSH key' },
  { pattern: /(^|\/)\.npmrc$/, reason: '.npmrc may contain registry tokens' },
];

const SECRET_PATTERNS = [
  { pattern: /gh[pousr]_[A-Za-z0-9]{36,}/, reason: 'GitHub token' },
  { pattern: /github_pat_[A-Za-z0-9_]{40,}/, reason: 'GitHub fine-grained token' },
  { pattern: /AKIA[0-9A-Z]{16}/, reason: 'AWS access key id' },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, reason: 'private key block' },
  { pattern: /xox[abposr]-[A-Za-z0-9-]{10,}/, reason: 'Slack token' },
  { pattern: /sk-[A-Za-z0-9_-]{32,}/, reason: 'API secret key (sk-...)' },
  { pattern: /AccountKey=[A-Za-z0-9+/=]{40,}/, reason: 'Azure storage account key' },
  {
    pattern: /(password|passwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][^"'\s]{12,}["']/i,
    reason: 'hard-coded credential assignment',
  },
];

/** Files whose content is generated or hash-heavy and would only produce noise. */
const SKIP_CONTENT = [/(^|\/)package-lock\.json$/, /(^|\/)routeTree\.gen\.ts$/, /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|zip)$/i];

const staged = git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (staged.length === 0) {
  console.log('check-secrets: nothing staged.');
  process.exit(0);
}

const findings = [];

for (const file of staged) {
  const base = file.split('/').pop() ?? file;
  if (!ALLOWED_ENV_FILES.has(base)) {
    for (const { pattern, reason } of BLOCKED_NAMES) {
      if (pattern.test(file)) findings.push(`${file}: ${reason}`);
    }
  }
  if (SKIP_CONTENT.some((pattern) => pattern.test(file))) continue;

  let content;
  try {
    content = git('show', `:${file}`);
  } catch {
    continue; // binary or unreadable staged blob
  }
  content.split('\n').forEach((line, index) => {
    for (const { pattern, reason } of SECRET_PATTERNS) {
      if (pattern.test(line)) findings.push(`${file}:${String(index + 1)}: ${reason}`);
    }
  });
}

if (findings.length > 0) {
  console.error(`check-secrets: ${String(findings.length)} finding(s) in staged changes:`);
  for (const finding of findings) console.error(`  - ${finding}`);
  console.error('Unstage or fix these files (git restore --staged <file>) before committing.');
  process.exit(1);
}

console.log(`check-secrets: ${String(staged.length)} staged file(s) scanned, no secrets found.`);
