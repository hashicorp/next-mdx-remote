import mdx from '@mdx-js/mdx'
import { transform } from 'esbuild'
import path from 'path'
import pkgDir from 'pkg-dir'
import { remove } from 'unist-util-remove'

// types
import { Plugin } from 'unified'
import { MDXRemoteSerializeResult, SerializeOptions } from './types'

/**
 * Ensure we use node's native require.resolve method,
 * webpack overrides require.resolve by default and returns the module ID
 * instead of the resolved path
 */
const requireResolve =
  // @ts-expect-error -- check if we're in a webpack context
  typeof __non_webpack_require__ === 'function'
    ? // @ts-expect-error -- __non_webpack_require__ === require at this point
      __non_webpack_require__.resolve
    : require.resolve

/**
 * Due to the way Next.js is built and deployed, esbuild's internal use of
 * __dirname to derive the path to its binary does not work. This function
 * gets around that by explicitly setting the path based on the CWD.
 *
 * Related: https://nextjs.org/docs/basic-features/data-fetching#reading-files-use-processcwd
 */
function setEsbuildBinaryPath() {
  const esbuildDir = pkgDir.sync(requireResolve('esbuild'))

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

setEsbuildBinaryPath()

/**
 * remark plugin which removes all import and export statements
 */
const removeImportsExportsPlugin: Plugin = () => (tree) =>
  remove(tree, ['import', 'export'])

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
  }: SerializeOptions = {}
): Promise<MDXRemoteSerializeResult> {
  mdxOptions.remarkPlugins = [
    ...(mdxOptions.remarkPlugins || []),
    removeImportsExportsPlugin,
  ]

  const compiledMdx = await mdx(source, { ...mdxOptions, skipExport: true })
  const transformResult = await transform(compiledMdx, {
    loader: 'jsx',
    jsxFactory: 'mdx',
    minify: true,
    target,
  })

  return {
    compiledSource: transformResult.code,
    scope,
  }
}
