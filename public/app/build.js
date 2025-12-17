import fs from 'fs';
import path from 'path';

fs.copyFileSync(
  path.resolve('./node_modules/preact/dist/preact.module.js'),
  path.resolve(`./preact.module.js`),
);
fs.copyFileSync(
  path.resolve('./node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js'),
  path.resolve(`./jsxRuntime.module.js`),
);
fs.copyFileSync(
  path.resolve('./node_modules/preact/hooks/dist/hooks.module.js'),
  path.resolve(`./hooks.module.js`),
);
