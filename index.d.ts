import hydrate from './src/hydrate'
import renderToString from './src/render-to-string'

declare module 'next-mdx-remote/render-to-string' {
  export default renderToString
}

declare module 'next-mdx-remote/hydrate' {
  export default hydrate
}
