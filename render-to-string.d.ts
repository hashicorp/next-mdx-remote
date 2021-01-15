import { MdxRemote } from 'types'
import { Pluggable, Compiler } from 'unified'

/**
 * Runs the MDX renderer on the MDX string provided with the components and data provided.
 */
export default function renderToString(
  /** Raw MDX contents as a string. */
  source: string,
  /** Optional parameters, such as components, plugins, and data. */
  params?: {
    /**
     * A object mapping names to React components.
     * The key used will be the name accessible to MDX.
     *
     * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
     */
    components?: MdxRemote.Components
    /**
     * An arbitrary object of data which will be supplied to the MDX.
     *
     * For example, in cases where you want to provide template variables to the MDX, like `my name is {name}`,
     * you could provide scope as `{ name: "Some name" }`.
     */
    scope?: Record<string, unknown>
    /**
     * Configuration for a provider to be wrapped around your mdx content.
     *
     * For example: `{ provider: FooProvider, props: { foo: 'bar' } }`
     */
    provider?: MdxRemote.Provider
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
): Promise<MdxRemote.Source>
