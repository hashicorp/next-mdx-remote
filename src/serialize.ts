import { compile } from '@mdx-js/mdx'
import { transform } from 'esbuild'
import path from 'path'
import pkgDir from 'pkg-dir'
import { remove } from 'unist-util-remove'

// TODO: Decide if we want to enable this
import { createFormattedMDXError } from './format-mdx-error'

// types
import { Plugin } from 'unified'
import { MDXRemoteSerializeResult, SerializeOptions } from './types'

/**
 * Due to the way Next.js is built and deployed, esbuild's internal use of
 * __dirname to derive the path to its binary does not work. This function
 * gets around that by explicitly setting the path based on the CWD.
 *
 * Related: https://nextjs.org/docs/basic-features/data-fetching#reading-files-use-processcwd
 */
function setEsbuildBinaryPath() {
  /**
   * Ensure we use node's native require.resolve method,
   * webpack overrides require.resolve by default and returns the module ID
   * instead of the resolved path
   */
  const esbuildDir = pkgDir.sync(eval('require.resolve')('esbuild'))

  if (!esbuildDir)
    throw new Error(
      '[next-mdx-remote] unable to determine path to esbuild, try setting process.env.ESBUILD_BINARY_PATH manually.'
    )

  // c.f.: https://www.arcath.net/2021/03/mdx-bundler#esbuild-executable
  if (process.platform === 'win32') {
    process.env.ESBUILD_BINARY_PATH = path.join(esbuildDir, 'esbuild.exe')
  } else {
    process.env.ESBUILD_BINARY_PATH = path.join(esbuildDir, 'bin', 'esbuild')
  }
}

// TODO: We'll probably want to make this optional, as use of esbuild is now opt-in
setEsbuildBinaryPath()

/**
 * remark plugin which removes all import and export statements
 */
function removeImportsExportsPlugin(): Plugin {
  return (tree) => remove(tree, 'mdxjsEsm')
}

/**
 * Parses and compiles the provided MDX string. Returns a result which can be passed into <MDXRemote /> to be rendered.
 */
export async function serialize(
  /** Raw MDX contents as a string. */
  source: string,
  {
    scope = {},
    mdxOptions = {},
    target = ['es2020', 'node12'],
    minify = false,
  }: SerializeOptions = {}
): Promise<MDXRemoteSerializeResult> {
  const areImportsEnabled = mdxOptions?.useDynamicImport

  // don't modify the original object when adding our own plugin
  // this allows code to reuse the same options object
  const remarkPlugins = [
    ...(mdxOptions.remarkPlugins || []),
    ...(areImportsEnabled ? [] : [removeImportsExportsPlugin]),
  ]

  const compileOptions = {
    ...mdxOptions,
    remarkPlugins,
  }

  let compiledMdx

  try {
    compiledMdx = await compile(source, {
      ...compileOptions,
      outputFormat: 'function-body',
      providerImportSource: '@mdx-js/react',
    })
  } catch (error: any) {
    const errorToThrow = createFormattedMDXError(error, source)

    throw errorToThrow
  }

  let compiledSource = String(compiledMdx)

  if (minify) {
    const transformResult = await transform(compiledSource, {
      loader: 'jsx',
      minify: true,
      target,
    })
    compiledSource = transformResult.code
  }

  return {
    compiledSource,
    scope,
  }
}
