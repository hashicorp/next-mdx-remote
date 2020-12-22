import * as React from 'react'
import { Plugin, Compiler } from 'unified'

/** An object containing components to be made available within mdx content */
interface MdxRemoteComponentsType {
  [componentName: string]: React.FunctionComponent | React.Component
}

/** Format of the output from renderToString and input to hydrate */
interface MdxRemoteSourceType {
  compiledSource: string
  renderedOutput: string
  scope?: Record<string, unknown>
}

declare module 'next-mdx-remote' {
  export type MdxRemoteSource = MdxRemoteSourceType
  export type MdxRemoteComponents = MdxRemoteComponentsType
}

declare module 'next-mdx-remote/hydrate' {
  export default function hydrate(
    /** Rendered MDX output. The direct output of `renderToString`. */
    source: MdxRemoteSourceType,
    /**
     * A map of names to React components.
     * The key used will be the name accessible to MDX.
     *
     * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
     */
    options: { components: MdxRemoteComponentsType }
  ): React.ReactNode
}

declare module 'next-mdx-remote/render-to-string' {
  /**
   * Runs the MDX renderer on the MDX string provided with the components and data provided.
   */
  export default async function renderToString(
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
      components?: MdxRemoteComponentsType
      /**
       * An arbitrary object of data which will be supplied to the MDX.
       *
       * For example, in cases where you want to provide template variables to the MDX, like `my name is {name}`,
       * you could provide scope as `{ name: "Some name" }`.
       */
      scope?: Record<string, unknown>
      /**
       * These options are passed to the MDX compiler.
       * See [the MDX docs.](https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js).
       */
      mdxOptions?: {
        remarkPlugins?: Plugin[]
        rehypePlugins?: Plugin[]
        hastPlugins?: Plugin[]
        compilers?: Compiler[]
        filepath?: string
      }
    }
  ): Promise<MdxRemoteSourceType>
}
