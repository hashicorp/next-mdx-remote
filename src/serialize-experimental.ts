import { VFile, VFileCompatible } from 'vfile'
import { matter } from 'vfile-matter'

import { createFormattedMDXError } from './format-mdx-error'

import type { MDXRemoteSerializeResult, SerializeOptions } from './types'

const jsxRuntimeImportPattern =
  /import \{ (?:(.+?) as _\1)(?:, (.+?) as _\2)?(?:, (.+?) as _\3)? \} from \"react\/jsx-runtime\";/
const importExportPattern = /^((import.+from.+)|(export.+))\n/gm

let bindings: any

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

  const swcBindings =
    bindings || (bindings = await require('next/dist/build/swc').loadBindings())

  let compiledMdx: string

  try {
    compiledMdx = await swcBindings.mdx.compile(
      String(vfile),
      getCompileOptions()
    )

    compiledMdx = compiledMdx
      .replace(
        // replace jsx-runtime imports with const declarations. Matches an arbitrary number of import specifiers (up to 3)
        jsxRuntimeImportPattern,
        (_, ...matches) => {
          const importSpecifiers = []

          for (const m of matches) {
            if (typeof m !== 'string') {
              // end of the matched import specifiers if we run into a non-string
              break
            }

            importSpecifiers.push(`${m}: _${m}`)
          }

          return `const {${importSpecifiers.join(',')}} = arguments[0];`
        }
      )
      .replace(
        `import { useMDXComponents as _provideComponents } from "@mdx-js/react";`,
        `const {useMDXComponents: _provideComponents} = arguments[0];`
      )
      .replace(`export default MDXContent;`, `return { default: MDXContent };`)
      // remove extraneous import and export statements
      .replace(importExportPattern, '')

    importExportPattern.lastIndex = 0
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
