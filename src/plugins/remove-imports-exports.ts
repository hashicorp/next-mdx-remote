/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { remove } from 'unist-util-remove'
import { Node } from 'unist'

/**
 * remark plugin which removes all import and export statements
 */
export function removeImportsExportsPlugin() {
  return (tree: Node) => remove(tree, 'mdxjsEsm')
}
