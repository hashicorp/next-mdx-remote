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
    external: ['react'],
    plugins: [resolve(), babel({ extensions })],
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
      '@babel/preset-react',
    ],
    plugins: [json(), resolve(), cjs(), babel({ extensions })],
  },
]
