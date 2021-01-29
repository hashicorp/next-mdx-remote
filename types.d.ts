import * as React from 'react'

export declare namespace MdxRemote {
  /** An object containing components to be made available within mdx content */
  interface Components {
    [componentName: string]: React.ReactNode
  }

  /** Format of the output from renderToString and input to hydrate */
  interface Source {
    compiledSource: string
    renderedOutput: string
    scope?: Record<string, unknown>
  }
  /** Format of the "provider" argument that is accepted by renderToString and hydrate */
  interface Provider {
    component: React.ReactNode
    props: Record<string, unknown>
  }
}
