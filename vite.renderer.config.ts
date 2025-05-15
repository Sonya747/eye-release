import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig } from 'vite';
import { pluginExposeRenderer } from './vite.base.config';

// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'renderer'>;
  const { root, mode, forgeConfigSelf } = forgeEnv;
  const name = forgeConfigSelf.name ?? '';

  return {
    root,
    mode,
    base: "./",
    build: {
      outDir: `.vite/renderer/${name}`,
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          main: 'index.html',
        },
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.onnx')) {
              return 'assets/models/[name][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    plugins: [pluginExposeRenderer(name)],
    resolve: {
      preserveSymlinks: true,
    },
    clearScreen: false,
    server: {
      fs: {
        // Allow serving files from one level up to the project root and node_modules
        allow: ['..', '../node_modules']
      },
      headers: {
        // Add WASM MIME type
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      }
    },
    optimizeDeps: {
      exclude: ['onnxruntime-web']
    },
    assetsInclude: ['**/*.onnx']
  } as UserConfig;
});
