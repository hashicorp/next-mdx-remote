import { ReactNode } from 'react'
import { MdxRemote } from 'types'

export default function hydrate(
  /** Rendered MDX output. The direct output of `renderToString`. */
  source: MdxRemote.Source,
  /**
   * A map of names to React components.
   * The key used will be the name accessible to MDX.
   *
   * For example: `{ ComponentName: Component }` will be accessible in the MDX as `<ComponentName/>`.
   */
  options?: { components?: MdxRemote.Components }
): ReactNode
