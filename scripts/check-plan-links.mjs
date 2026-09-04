import { readFileSync, existsSync } from 'node:fs';
const text = readFileSync('docs/architecture/implementation-order.md', 'utf8');
const paths = [...text.matchAll(/`(docs\/superpowers\/plans\/[^`]+\.md)`/g)].map((match) => match[1]);
if (paths.length !== 8 || paths.some((path) => !existsSync(path))) {
  console.error('Implementation plan links are incomplete or invalid.');
  process.exit(1);
}
