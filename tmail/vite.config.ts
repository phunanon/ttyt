import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/tmail/',
  plugins: [preact()],
  build: { sourcemap: true },
});
