import hydrate from './hydrate'
import renderToString from './render-to-string'
import useHydrate from './useHydrate'

declare module 'next-mdx-remote/render-to-string' {
  export default renderToString
}

declare module 'next-mdx-remote/hydrate' {
  export default hydrate
}

declare module 'next-mdx-remote/useHydrate' {
  export default useHydrate
}
