import mdx from '@mdx-js/mdx'
import { transform } from 'esbuild'
import path from 'path'
import pkgDir from 'pkg-dir'
import { remove } from 'unist-util-remove'

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
   * Now we have the correct path for ESBUILD (with ESBUILD_PATH), we can replace baseDir
   */

  //  const baseDir = pkgDir.sync() || process.cwd()
  const baseDir = process.env.ESBUILD_PATH

  if (!baseDir) {
    throw new Error('next-mdx-remote(serialize): baseDir is undefined')
  }

  /**
   * and now we'll have the correct path for ESBUILD_BINARY_PATH
   */
  // c.f.: https://www.arcath.net/2021/03/mdx-bundler#esbuild-executable
  if (process.platform === 'win32') {
    process.env.ESBUILD_BINARY_PATH = path.join(baseDir, 'esbuild.exe')
  } else {
    process.env.ESBUILD_BINARY_PATH = path.join(baseDir, 'bin', 'esbuild')
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
