import renderToString from './render-to-string'
import useHydrate from './useHydrate'

declare module 'next-mdx-remote/render-to-string' {
  export default renderToString
}

declare module 'next-mdx-remote/useHydrate' {
  export default useHydrate
}
