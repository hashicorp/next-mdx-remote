import hydrate from './hydrate'
import renderToString from './render-to-string'

declare module 'next-mdx-remote/render-to-string' {
  export default renderToString
}

declare module 'next-mdx-remote/hydrate' {
  export default hydrate
}
