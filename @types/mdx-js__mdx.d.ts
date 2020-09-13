declare module '@mdx-js/mdx' {
  export interface Options {}

  export default function mdx(source: string, options: Options): Promise<string>
}
