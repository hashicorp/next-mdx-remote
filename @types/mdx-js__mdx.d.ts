declare module '@mdx-js/mdx' {
  export interface MdxOptions {
    mdPlugins?: any[]
    rehypePlugins?: any[]
    hastPlugins?: any[]
    compilers?: any[]
    filepath?: string
    skipExport?: boolean
  }

  export default function mdx(
    source: string,
    options: MdxOptions
  ): Promise<string>
}
