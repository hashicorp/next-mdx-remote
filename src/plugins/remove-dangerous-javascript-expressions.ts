/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import type { Plugin } from 'unified'
import type { Program } from 'estree-jsx'

// Dangerous identifiers
const BLOCKED_GLOBALS = [
  'eval',
  'Function',
  'AsyncFunction',
  'GeneratorFunction',
  'FunctionConstructor',
  'require',
  'process',
  'global',
  'globalThis',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'child_process',
  'fs',
  'net',
  'http',
  'https',
  'vm',
  'worker_threads',
  'Reflect',
]

// Built-in constructors that can be used to reach Function constructor
const BUILTIN_CONSTRUCTORS = [
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Error',
  'Date',
  'RegExp',
  'Promise',
  'Proxy',
  'Reflect',
  'WeakMap',
  'WeakSet',
  'Map',
  'Set',
]

const BLOCKED_PROPERTIES = [
  'constructor',
  'prototype',
  '__proto__',
  'eval',
  'Reflect',
  'Function',
  'AsyncFunction',
  'GeneratorFunction',
  'FunctionConstructor',
  'require',
]

export const CreateRemoveDangerousCallsPlugin = (
  blocked_globals?: string[],
  blocked_properties?: string[]
): Plugin<any[], Program> => {
  return function () {
    return function (tree: Program) {
      walk(
        tree,
        blocked_globals ?? BLOCKED_GLOBALS,
        blocked_properties ?? BLOCKED_PROPERTIES
      )
      return tree // Must return the tree for RSC
    }
  }
}

function walk(
  node: any,
  blocked_globals: string[],
  blocked_properties: string[]
): void {
  if (!node || typeof node !== 'object') return

  // Block dangerous identifiers
  if (node.type === 'Identifier' && blocked_globals.includes(node.name)) {
    // Only block if it's not a property name or parameter
    const parent = node.parent
    const isProperty =
      parent?.type === 'MemberExpression' &&
      parent.property === node &&
      !parent.computed
    const isParam =
      parent?.type === 'FunctionDeclaration' ||
      parent?.type === 'FunctionExpression'

    if (!isProperty && !isParam) {
      throw new Error(`Security: Access to '${node.name}' is not allowed`)
    }
  }

  // Block function calls to dangerous globals
  if (node.type === 'CallExpression' && node.callee?.type === 'Identifier') {
    if (blocked_globals.includes(node.callee.name)) {
      throw new Error(`Security: ${node.callee.name}() calls are not allowed`)
    }
  }

  // Block function calls on computed properties of dangerous globals
  // e.g., Object['constructor'](...), Object[expr](...)
  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.computed &&
    node.callee.object?.type === 'Identifier' &&
    blocked_globals.includes(node.callee.object.name)
  ) {
    throw new Error(
      `Security: Function calls on computed properties of '${node.callee.object.name}' are not allowed`
    )
  }

  // Block function calls on computed properties of built-in constructors
  // This prevents: Object[['constructor'].join('')](...), Array[expr](...)
  // But allows: Object[expr] for reading (e.g., Object[key])
  if (
    node.type === 'CallExpression' &&
    node.callee?.type === 'MemberExpression' &&
    node.callee.computed &&
    node.callee.object?.type === 'Identifier' &&
    BUILTIN_CONSTRUCTORS.includes(node.callee.object.name)
  ) {
    throw new Error(
      `Security: Function calls on computed properties of '${node.callee.object.name}' are not allowed`
    )
  }

  // Block member expressions to dangerous properties
  if (node.type === 'MemberExpression') {
    const prop = node.property

    // obj.constructor, obj.prototype, etc.
    if (
      prop?.type === 'Identifier' &&
      !node.computed &&
      blocked_properties.includes(prop.name)
    ) {
      throw new Error(`Security: .${prop.name} access is not allowed`)
    }

    // obj["constructor"], obj['prototype'], etc.
    if (
      prop?.type === 'Literal' &&
      blocked_properties.includes(String(prop.value))
    ) {
      throw new Error(`Security: ["${prop.value}"] access is not allowed`)
    }

    // Block computed property access on dangerous globals only
    // Built-in constructors (Object, Array, etc.) are NOT blocked here for reading
    // They are only blocked when CALLING the result (see CallExpression check above)
    if (
      node.computed &&
      node.object?.type === 'Identifier' &&
      blocked_globals.includes(node.object.name)
    ) {
      throw new Error(
        `Security: Computed property access on '${node.object.name}' is not allowed`
      )
    }

    // Block access to blocked global objects
    if (
      node.object?.type === 'Identifier' &&
      blocked_globals.includes(node.object.name)
    ) {
      throw new Error(
        `Security: Access to '${node.object.name}' properties is not allowed`
      )
    }
  }

  // Block dynamic imports
  // if (node.type === "ImportExpression") {
  //   throw new Error("Security: Dynamic import() is not allowed");
  // }

  // Block new Function()
  if (node.type === 'NewExpression' && node.callee?.type === 'Identifier') {
    if (blocked_globals.includes(node.callee.name)) {
      throw new Error(`Security: new ${node.callee.name}() is not allowed`)
    }
  }

  // Recurse through all child nodes
  for (const key in node) {
    if (key === 'parent' || key === 'position') continue

    const value = node[key]
    if (Array.isArray(value)) {
      value.forEach((child) => {
        if (child && typeof child === 'object') {
          walk(child, blocked_globals, blocked_properties)
        }
      })
    } else if (value && typeof value === 'object') {
      walk(value, blocked_globals, blocked_properties)
    }
  }
}
