/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { visit, SKIP } from 'unist-util-visit'
import type { Plugin } from 'unified'

/**
 * Remark plugin that removes JavaScript expressions from MDX.
 * This blocks patterns like {variable} or {func()} that enable code execution.
 *
 * Safe patterns (preserved):
 * - JSX: <Component />
 * - Markdown: # Heading, **bold**, etc.
 *
 * Blocked patterns:
 * - JS expressions: {variable}, {func()}, {obj.prop}
 * - JSX attribute expressions: <Component prop={value} />
 */
export const removeJavaScriptExpressions: Plugin = () => {
  return (tree: any) => {
    visit(tree, (node: any, index: number | undefined, parent: any) => {
      // Remove mdxFlowExpression and mdxTextExpression nodes (JS expressions in MDX)
      if (
        node.type === 'mdxFlowExpression' ||
        node.type === 'mdxTextExpression'
      ) {
        // Remove this node from parent
        if (parent && typeof index === 'number') {
          parent.children.splice(index, 1)
          return [SKIP, index]
        }
      }

      // Remove JavaScript expressions from JSX attribute values
      if (
        node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement'
      ) {
        if (node.attributes) {
          node.attributes = node.attributes.filter((attr: any) => {
            // Keep literal values, remove expression values
            if (attr.type === 'mdxJsxAttribute') {
              // If the value is null (boolean attribute) or a literal string, keep it
              return (
                attr.value === null ||
                typeof attr.value === 'string' ||
                (attr.value &&
                  attr.value.type !== 'mdxJsxAttributeValueExpression')
              )
            }
            // Remove spread attributes entirely as they're JS expressions
            return attr.type !== 'mdxJsxExpressionAttribute'
          })
        }
      }
    })
  }
}
