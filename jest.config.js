/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

export default {
  testPathIgnorePatterns: ['fixtures'],
  transform: {
    '\\.m?[jt]sx?$': [
      'esbuild-jest',
      {
        sourcemap: true,
        loaders: {
          '.mjs': 'jsx',
        },
        format: 'esm',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  verbose: true,
}
