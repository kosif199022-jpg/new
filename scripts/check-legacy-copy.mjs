import { readdirSync } from 'node:fs';
const banned = ['kosif-unified', 'kosif-stable-next', 'aurora-finance', 'sky-main', 'Acc-main', 'mahmoud1990'];
const roots = readdirSync('.', { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
const hits = roots.filter((name) => banned.some((prefix) => name.includes(prefix)));
if (hits.length) {
  console.error(`Legacy application trees are forbidden: ${hits.join(', ')}`);
  process.exit(1);
}
