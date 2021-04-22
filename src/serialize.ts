import mdx from '@mdx-js/mdx'
import { transform } from 'esbuild'
import path from 'path'
import pkgDir from 'pkg-dir'

// types
import { Pluggable, Compiler } from 'unified'

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

interface Options {
  /**
   * Pass-through variables for use in the MDX content
   */
  scope?: Record<string, unknown>
  /**
   * These options are passed to the MDX compiler.
   * See [the MDX docs.](https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js).
   */
  mdxOptions?: {
    remarkPlugins?: Pluggable[]
    rehypePlugins?: Pluggable[]
    hastPlugins?: Pluggable[]
    compilers?: Compiler[]
    filepath?: string
  }
}

/**
 * Parses and compiles the provided MDX string. Returns a result which can be passed into <MDXRemote /> to be rendered.
 */
export async function serialize(
  /** Raw MDX contents as a string. */
  source: string,
  { scope = {}, mdxOptions = {} }: Options = {}
) {
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
