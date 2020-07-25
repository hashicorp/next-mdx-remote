// temporary definition file unill @mdx-js/mdx@2.0.0
declare module '@mdx-js/mdx' {
  export interface Options {
    [key: string]: any
  }
  export default function mdx(source: string, options: Options): Promise<string>
}
