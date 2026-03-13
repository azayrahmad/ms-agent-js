import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';

const getAgentTargets = () => {
  const agentsDir = resolve(__dirname, 'public/agents');
  if (!fs.existsSync(agentsDir)) return [];

  return fs.readdirSync(agentsDir)
    .filter(f => fs.statSync(resolve(agentsDir, f)).isDirectory())
    .flatMap(agent => [
      { src: `public/agents/${agent}/agent.json`, dest: `agents/${agent}` },
      { src: `public/agents/${agent}/agent.webp`, dest: `agents/${agent}` },
      { src: `public/agents/${agent}/agent.webm`, dest: `agents/${agent}` },
    ])
    .filter(target => fs.existsSync(resolve(__dirname, target.src)));
};

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MSAgentJS',
      fileName: (format) => `ms-agent-js.${format}.js`,
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: getAgentTargets()
    })
  ]
});
