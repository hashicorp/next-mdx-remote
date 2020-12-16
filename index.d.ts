// Type definitions for next-mdx-remote
// Project: https://github.com/hashicorp/next-mdx-remote
// Definitions by: Steven Schmatz <https://github.com/stevenschmatz>

declare module 'next-mdx-remote/render-to-string' {
  import * as React from 'react';

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
      components?: { 
        [componentName: string]: React.FunctionComponent | React.Component;
      };
      /**
       * An arbitrary object of data which will be supplied to the MDX.
       *
       * For example, in cases where you want to provide template variables to the MDX, like `my name is {name}`,
       * you could provide scope as `{ name: "Some name" }`.
       */
      scope?: object;
      /**
       * These options are passed to the MDX compiler.
       * See [the MDX docs.](https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js).
       */
      mdxOptions?: {
        remarkPlugins?: any[];
        rehypePlugins?: any[];
        hastPlugins?: any[];
        compilers?: any[];
        filepath?: string;
      };
    }
  ): Promise<{
    compiledSource: string;
    renderedOutput: string;
    scope?: Record<string, unknown>;
  }>;
}

declare module 'next-mdx-remote/hydrate' {
  import * as React from 'react';

  /**
   * Consumes the output of `renderToString` as well as the same components argument as `renderToString`.
   * Its result can be rendered directly into your component.
   *
   * This function is intended to run on the **client-side**.
   * It will initially render static content, and hydrate it when the browser isn't busy with higher priority tasks.
   *
   * For more information and examples, consult [the documentation](https://github.com/hashicorp/next-mdx-remote#apis).
   */
  export default function hydrate(
    /** Rendered MDX output. The direct output of `renderToString`. */
    source: {
      compiledSource: string;
      renderedOutput: string;
      scope?: Record<string, unknown>;
    },
    /**
     * A map of names to React components.
     * The key used will be the name accessible to MDX.
     *
     * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
     */
    params?: { 
      [componentName: string]: React.FunctionComponent | React.Component;
    }
  ): React.ReactNode;
}
