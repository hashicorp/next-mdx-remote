/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { remove } from 'unist-util-remove'
import { Plugin } from 'unified'
import { Root } from 'mdast'

/**
 * remark plugin which removes all import and export statements
 */
export const removeImportsExportsPlugin: Plugin<[], Root> = () => {
  return (tree) => remove(tree, 'mdxjsEsm')
}
