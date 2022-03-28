import { Pluggable, Compiler } from 'unified'
import { CompileOptions } from '@mdx-js/mdx'

export interface SerializeOptions {
  /**
   * Pass-through variables for use in the MDX content
   */
  scope?: Record<string, unknown>
  /**
   * These options are passed to the MDX compiler.
   * See [the MDX docs.](https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js).
   */
  mdxOptions?: Omit<CompileOptions, 'outputFormat' | 'providerImportSource'>
  /**
   * Indicate whether or not frontmatter should be parsed out of the MDX. Defaults to false
   */
  parseFrontmatter?: boolean
}

/**
 * Represents the return value of a call to serialize()
 */
export type MDXRemoteSerializeResult<TScope = Record<string, unknown>> = {
  /**
   * The compiledSource, generated from next-mdx-remote/serialize
   */
  compiledSource: string
  /**
   * An arbitrary object of data which will be supplied to the MDX.
   *
   * For example, in cases where you want to provide template variables to the MDX, like `my name is {name}`,
   * you could provide scope as `{ name: "Some name" }`.
   */
  scope?: TScope
  /**
   * If parseFrontmatter was set to true, contains any parsed frontmatter found in the MDX source.
   */
  frontmatter?: Frontmatter
}

type Frontmatter =
  | null
  | boolean
  | number
  | string
  | FrontmatterArray
  | FrontmatterObject

// Older versions of typescript do not support recursive inline types; this is a workaround for that.
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#more-recursive-type-aliases
type FrontmatterArray = Array<Frontmatter>;
type FrontmatterObject = { [key: string]: Frontmatter }