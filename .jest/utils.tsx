import ReactDOMServer from 'react-dom/server'
import React from 'react'

import { MDXRemote, MDXRemoteProps } from '../src/index'
import { serialize } from '../src/serialize'
import { SerializeOptions } from '../src/types'

export async function renderStatic(
  mdx: string,
  {
    components,
    scope,
    mdxOptions,
    minifyOptions,
    parseFrontmatter,
  }: SerializeOptions & Pick<MDXRemoteProps, 'components'> = {}
): Promise<string> {
  const mdxSource = await serialize(mdx, {
    mdxOptions,
    minifyOptions,
    parseFrontmatter,
  })

  return ReactDOMServer.renderToStaticMarkup(
    <MDXRemote {...mdxSource} components={components} scope={scope} />
  )
}
