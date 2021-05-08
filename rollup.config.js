import resolve from '@rollup/plugin-node-resolve'
import cjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import ts from '@rollup/plugin-typescript'

// These extensions are not being used
const extensions = ['.js', '.jsx', '.ts', '.tsx']

function getEsbuildModulePath() {
  /**
   * The idea here is grasp Node require.resolve (which finds the dependency no matter
   * where in the root the dependency is) to find `esbuild`.
   *
   * Although require.resolve returns the file specified in the `main` package.json, e.g.:
   * /home/raulmelo/development/raulmelo-studio/node_modules/esbuild/lib/main.js
   */
  const fullPath = require.resolve('esbuild')
  /**
   * Since we just want the relative (til esbuild), we could simple filter everything
   * AFTER the word "esbuild"
   */
  const regexEverythingAfterWord = /(?<=esbuild).*$/gm

  /**
   * and strip it out.
   *
   * Final result will be:
   * /home/raulmelo/development/raulmelo-studio/node_modules/esbuild
   */
  return fullPath.replace(regexEverythingAfterWord, '')
}

/**
 * This plugin injects a process env in build time.
 *
 * We could move the logic to determine the `ESBUILD_BINARY_PATH` at this point
 * but it's totally up to you decide the best strategy.
 */
const injectPluginConfigured = injectProcessEnv({
  ESBUILD_PATH: getEsbuildModulePath(),
})

export default [
  {
    input: './src/index.tsx',
    output: {
      dir: './dist',
      format: 'cjs',
    },
    external: ['react', '@mdx-js/react'],
    plugins: [
      injectPluginConfigured,
      ts({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
      }),
      resolve(),
      {
        // ensure that the requestIdleCallback polyfill file is marked as having
        // side-effects so that it gets bundled
        name: 'ensure-idle-callback-polyfill',
        transform(code, id) {
          if (id.includes('idle-callback-polyfill.js')) {
            return { code, moduleSideEffects: true }
          }
        },
      },
    ],
  },
  {
    input: './src/serialize.ts',
    output: {
      dir: './dist',
      format: 'cjs',
    },
    external: ['@mdx-js/mdx', 'esbuild', 'pkg-dir'],
    plugins: [
      injectPluginConfigured,
      ts({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
      }),
      json(),
      resolve(),
      cjs(),
    ],
  },
]
