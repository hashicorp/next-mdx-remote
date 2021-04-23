import mdx from '@mdx-js/mdx'
import { transform } from 'esbuild'
import path from 'path'
import pkgDir from 'pkg-dir'

// types
import { Pluggable, Compiler } from 'unified'
import { MDXRemoteSerialize, SerializeOptions } from './types'

/**
 * Due to the way Next.js is built and deployed, esbuild's internal use of
 * __dirname to derive the path to its binary does not work. This function
 * gets around that by explicitly setting the path based on the CWD.
 *
 * Related: https://nextjs.org/docs/basic-features/data-fetching#reading-files-use-processcwd
 */
function setEsbuildBinaryPath() {
  // c.f.: https://www.arcath.net/2021/03/mdx-bundler#esbuild-executable
  const baseDir = pkgDir.sync() || process.cwd()

  if (process.platform === 'win32') {
    process.env.ESBUILD_BINARY_PATH = path.join(
      baseDir,
      'node_modules',
      'esbuild',
      'esbuild.exe'
    )
  } else {
    process.env.ESBUILD_BINARY_PATH = path.join(
      baseDir,
      'node_modules',
      'esbuild',
      'bin',
      'esbuild'
    )
  }
}

setEsbuildBinaryPath()

function removeImportsPlugin() {
  return function transformer(tree) {}
}

/**
 * Parses and compiles the provided MDX string. Returns a result which can be passed into <MDXRemote /> to be rendered.
 */
export async function serialize(
  /** Raw MDX contents as a string. */
  source: string,
  { scope = {}, mdxOptions = {} }: SerializeOptions = {}
): Promise<MDXRemoteSerialize> {
  const compiledMdx = await mdx(source, { ...mdxOptions, skipExport: true })
  const transformResult = await transform(compiledMdx, {
    loader: 'jsx',
    jsxFactory: 'mdx',
    minify: true,
  })

  return {
    compiledSource: transformResult.code,
    scope,
  }
}
