import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const isApp = mode === 'app';
  const isDev = mode === 'development';

  return {
    base: isApp ? '/ms-agent-js/' : '/',
    publicDir: isApp || isDev ? 'public' : false,
    test: {
      setupFiles: ['tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        exclude: ['tests/**', 'scripts/**', 'vite.config.ts'],
      },
      exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
    },
    build: {
      outDir: isApp ? 'dist-app' : 'dist',
      emptyOutDir: true,
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
            src: 'public/agents/**/*',
            dest: 'agents',
            rename: {
              stripBase: 2,
            },
          },
        ],
      }),
      {
        name: 'minify-agent-json',
        apply: 'build',
        enforce: 'post',
        closeBundle: async () => {
          const { promises: fs } = await import('fs');
          const outDirs = ['dist', 'dist-app'];

          for (const outDir of outDirs) {
            const agentsDir = resolve(__dirname, outDir, 'agents');
            try {
              const entries = await fs.readdir(agentsDir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const agentJsonPath = resolve(agentsDir, entry.name, 'agent.json');
                  try {
                    const content = await fs.readFile(agentJsonPath, 'utf-8');
                    const minified = JSON.stringify(JSON.parse(content));
                    await fs.writeFile(agentJsonPath, minified);
                  } catch (e) {
                    // Ignore if agent.json doesn't exist in a subfolder
                  }
                }
              }
            } catch (e) {
              // Ignore if outDir or agentsDir doesn't exist
            }
          }
        },
      },
    ],
  };
});
