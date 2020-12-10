import * as React from 'react'

declare module 'next-mdx-remote/hydrate' {
  export interface MdxSource {
    compiledSource: string
    renderedOutput: string
    scope?: Record<string, unknown>
  }

  export default function hydrate(
    source: MdxSource,
    options: {
      components: { [key: string]: React.FunctionComponent | React.Component }
    }
  )
}
