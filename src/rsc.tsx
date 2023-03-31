/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import React from 'react'
import { jsxRuntime } from './jsx-runtime.cjs'
import { MDXRemoteSerializeResult, SerializeOptions } from './types'
import { VFileCompatible } from 'vfile'
import { serialize } from './serialize'

type FunctionComponent<Props> = (props: Props) => JSX.Element | null
type AsyncFunctionComponent<Props> = (
  props: Props
) => Promise<JSX.Element | null>

// Class components are not allowed in RSCs, but are allowed in client
// components. Hence we still accept it here. If the user forgets to configure
// the class component in a `"use client"` file, they will get a build error.
type ClassComponent<Props> = new (props: Props) => JSX.ElementClass

type Component<Props> =
  | FunctionComponent<Props>
  | AsyncFunctionComponent<Props>
  | ClassComponent<Props>

interface NestedMDXComponents {
  [key: string]:
    | NestedMDXComponents
    | Component<any>
    | keyof JSX.IntrinsicElements
}

type MDXComponents = NestedMDXComponents & {
  [Key in keyof JSX.IntrinsicElements]?:
    | Component<JSX.IntrinsicElements[Key]>
    | keyof JSX.IntrinsicElements
} & {
  /**
   * If a wrapper component is defined, the MDX content will be wrapped inside of it.
   */
  wrapper?: Component<any>
}

export type MDXRemoteProps = {
  source: VFileCompatible
  options?: SerializeOptions
  /**
   * An object mapping names to React components.
   * The key used will be the name accessible to MDX.
   *
   * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
   */
  components?: MDXComponents | undefined
}

export { MDXRemoteSerializeResult }

export type CompileMDXResult<TFrontmatter = Record<string, unknown>> = {
  content: React.ReactElement
  frontmatter: TFrontmatter
}

export async function compileMDX<TFrontmatter = Record<string, unknown>>({
  source,
  options,
  components = {},
}: MDXRemoteProps): Promise<CompileMDXResult<TFrontmatter>> {
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
