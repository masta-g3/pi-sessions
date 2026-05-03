import { chmod, writeFile } from 'node:fs/promises';

const content = `#!/usr/bin/env node\nimport './src/cli.js';\n`;
await writeFile('dist/cli.js', content, 'utf8');
await chmod('dist/cli.js', 0o755);
