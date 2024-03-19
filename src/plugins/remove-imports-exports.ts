/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { remove } from 'unist-util-remove'
import { Plugin } from 'unified'

/**
 * remark plugin which removes all import and export statements
 */
export function removeImportsExportsPlugin(): Plugin {
  return (ast) =>
    remove(
      ast,
      (node) =>
        node.type === 'mdxjsEsm' &&
        node.data.estree.body[0].type === 'ImportDeclaration'
    )
}
