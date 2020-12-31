import { ReactNode } from 'react'
import { MdxRemote } from './types'

export default function hydrate(
  /** Rendered MDX output. The direct output of `renderToString`. */
  source: MdxRemote.Source,
  options?: {
    /**
     * A map of names to React components.
     * The key used will be the name accessible to MDX.
     *
     * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
     */
    components?: MdxRemote.Components
    /**
     * Configuration for a provider to be wrapped around your mdx content.
     *
     * For example: `{ provider: FooProvider, props: { foo: 'bar' } }`
     */
    provider?: MdxRemote.Provider
  }
): {
    isHydrated: boolean;
    content: ReactNode;
}
