/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import React from 'react'
import { jsxRuntime } from './jsx-runtime.cjs'
import { MDXRemoteSerializeResult, SerializeOptions } from './types'
import { VFileCompatible } from 'vfile'
import { MDXProvider } from '@mdx-js/react'
import { serialize } from './serialize'

export type MDXRemoteProps = Omit<
  MDXRemoteSerializeResult,
  'compiledSource'
> & {
  source: VFileCompatible
  options?: SerializeOptions
  /**
   * An object mapping names to React components.
   * The key used will be the name accessible to MDX.
   *
   * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
   */
  components?: React.ComponentProps<typeof MDXProvider>['components']
}

export { MDXRemoteSerializeResult }

export async function compileMDX<TFrontmatter = Record<string, unknown>>({
  source,
  options,
  components = {},
}: MDXRemoteProps) {
  const { compiledSource, frontmatter, scope } = await serialize<
    Record<string, unknown>,
    TFrontmatter
  >(
    source,
    options,
    // Enable RSC importSource
    true
  )
  // if we're ready to render, we can assemble the component tree and let React do its thing
  // first we set up the scope which has to include the mdx custom
  // create element function as well as any components we're using
  const fullScope = Object.assign(
    {
      opts: jsxRuntime,
    },
    { frontmatter },
    scope
  )
  const keys = Object.keys(fullScope)
  const values = Object.values(fullScope)

  // now we eval the source code using a function constructor
  // in order for this to work we need to have React, the mdx createElement,
  // and all our components in scope for the function, which is the case here
  // we pass the names (via keys) in as the function's args, and execute the
  // function with the actual values.
  const hydrateFn = Reflect.construct(
    Function,
    keys.concat(`${compiledSource}`)
  )

  const Content: React.ElementType = hydrateFn.apply(hydrateFn, values).default

  return {
    content: <Content components={components} />,
    frontmatter,
  }
}

/**
 * Renders compiled source from next-mdx-remote/serialize.
 */
export async function MDXRemote(props: MDXRemoteProps) {
  const { content } = await compileMDX(props)
  return content
}
