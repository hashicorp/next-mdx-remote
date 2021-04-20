import resolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import cjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

const extensions = ['.js', '.jsx', '.ts', '.tsx']

export default [
  {
    input: 'src/mdx-remote.jsx',
    output: {
      file: 'dist/mdx-remote.js',
      format: 'cjs',
    },
    external: ['react', '@mdx-js/react'],
    plugins: [
      resolve(),
      babel({ extensions }),
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
    input: 'src/serialize.js',
    output: {
      file: 'dist/serialize.js',
      format: 'cjs',
    },
    external: [
      '@mdx-js/mdx',
      '@babel/core',
      '@babel/preset-env',
      '@babel/plugin-transform-react-jsx',
    ],
    plugins: [json(), resolve(), cjs(), babel({ extensions })],
  },
]
