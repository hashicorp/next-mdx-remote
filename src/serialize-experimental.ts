import { VFile, VFileCompatible } from 'vfile'
import { matter } from 'vfile-matter'
import { loadBindings } from 'next/dist/build/swc'

import { createFormattedMDXError } from './format-mdx-error'
// import { removeImportsExportsPlugin } from './plugins/remove-imports-exports'

// types
import { MDXRemoteSerializeResult, SerializeOptions } from './types'

let bindings: any
let compile: any

function getCompileOptions() {
  return {
    outputFormat: 'function-body',
    providerImportSource: '@mdx-js/react',
  }
}

/**
 * Parses and compiles the provided MDX string. Returns a result which can be passed into <MDXRemote /> to be rendered.
 */
export async function serialize(
  source: VFileCompatible,
  {
    scope = {},
    // mdxOptions = {},
    parseFrontmatter = false,
  }: SerializeOptions = {}
): Promise<MDXRemoteSerializeResult> {
  const vfile = new VFile(source)

  // makes frontmatter available via vfile.data.matter
  if (parseFrontmatter) {
    matter(vfile, { strip: true })
  }

  const swcBindings = bindings || (bindings = await loadBindings())

  let compiledMdx

  try {
    compiledMdx = await swcBindings.mdx.compile(
      String(vfile),
      getCompileOptions()
    )

    compiledMdx = compiledMdx
      .replace(
        `import { jsx as _jsx } from "react/jsx-runtime";`,
        `const {jsx: _jsx} = arguments[0];`
      )
      .replace(
        `import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";`,
        `const { jsx: _jsx, jsxs: _jsxs } = arguments[0];`
      )
      .replace(
        `import { useMDXComponents as _provideComponents } from "@mdx-js/react";`,
        `const {useMDXComponents: _provideComponents} = arguments[0];`
      )
      .replace(`export default MDXContent;`, `return { default: MDXContent };`)
  } catch (error: any) {
    throw createFormattedMDXError(error, String(vfile))
  }

  let compiledSource = String(compiledMdx)

  return {
    compiledSource,
    frontmatter:
      (vfile.data.matter as Record<string, string> | undefined) ?? {},
    scope,
  }
}
