/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { compile, CompileOptions } from '@mdx-js/mdx'
import { VFile, VFileCompatible } from 'vfile'
import { matter } from 'vfile-matter'

import { createFormattedMDXError } from './format-mdx-error.js'
import { removeImportsExportsPlugin } from './plugins/remove-imports-exports.js'

// types
import type { MDXRemoteSerializeResult, SerializeOptions } from './types.js'

function getCompileOptions(
  mdxOptions: SerializeOptions['mdxOptions'] = {},
  rsc: boolean = false
): CompileOptions {
  const areImportsEnabled = mdxOptions.useDynamicImport ?? false
  // don't modify the original object when adding our own plugin
  // this allows code to reuse the same options object
  const remarkPlugins = [
    ...(mdxOptions.remarkPlugins || []),
    ...(areImportsEnabled ? [] : [removeImportsExportsPlugin]),
  ]

  return {
    ...mdxOptions,
    remarkPlugins,
    outputFormat: 'function-body',
    // Disable the importSource option for RSC to ensure there's no `useMDXComponents` implemented.
    providerImportSource: rsc ? undefined : '@mdx-js/react',
    development: process.env.NODE_ENV !== 'production',
  }
}

/**
 * Parses and compiles the provided MDX string. Returns a result which can be passed into <MDXRemote /> to be rendered.
 */
export async function serialize<
  TScope = Record<string, unknown>,
  TFrontmatter = Record<string, unknown>
>(
  source: VFileCompatible,
  {
    scope = {},
    mdxOptions = {},
    parseFrontmatter = false,
  }: SerializeOptions = {},
  rsc: boolean = false
): Promise<MDXRemoteSerializeResult<TScope, TFrontmatter>> {
  const vfile = new VFile(source)

  // makes frontmatter available via vfile.data.matter
  if (parseFrontmatter) {
    matter(vfile, { strip: true })
  }

  let compiledMdx: VFile

  try {
    compiledMdx = await compile(vfile, getCompileOptions(mdxOptions, rsc))
  } catch (error: any) {
    throw createFormattedMDXError(error, String(vfile))
  }

  let compiledSource = String(compiledMdx)

  return {
    compiledSource,
    frontmatter: (vfile.data.matter ?? {}) as TFrontmatter,
    scope: scope as TScope,
  }
}
