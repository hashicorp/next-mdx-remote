import resolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import cjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'

const plugins = []

export default [
  {
    input: 'src/hydrate.js',
    output: {
      file: 'dist/hydrate.js',
      format: 'cjs',
    },
    external: ['react'],
    plugins: [resolve(), babel()],
  },
  {
    input: 'src/render-to-string.js',
    output: {
      file: 'dist/render-to-string.js',
      format: 'cjs',
    },
    external: [
      'react',
      'react-dom',
      'react-dom/server',
      '@babel/core',
      '@babel/preset-env',
      '@babel/preset-react',
    ],
    plugins: [json(), cjs(), resolve(), babel()],
  },
]
