/**
 * Copyright IBM Corp. 2020, 2024
 * SPDX-License-Identifier: MPL-2.0
 */

import { remove } from 'unist-util-remove'
import type { Plugin } from 'unified'

/**
 * remark plugin which removes all import and export statements
 */
export function removeImportsExportsPlugin(): Plugin<any[]> {
  return (tree) => remove(tree, 'mdxjsEsm')
}
