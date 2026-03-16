import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app';

  return {
    base: isApp ? '/ms-agent-js/' : '/',
    test: {
      setupFiles: ['tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        exclude: ['tests/**', 'scripts/**', 'vite.config.ts'],
      },
    },
    build: {
      outDir: isApp ? 'dist-app' : 'dist',
      emptyOutDir: false,
      lib: isApp
        ? undefined
        : {
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
        targets: [
          {
            src: 'public/agents/*',
            dest: 'agents',
          },
        ],
      }),
    ],
  };
});
