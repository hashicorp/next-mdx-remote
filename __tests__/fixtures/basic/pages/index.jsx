import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import renderToString from '../../../../render-to-string'
import hydrate from '../../../../hydrate'
import Test from '../components/test'

const MDX_COMPONENTS = { Test }

export default function TestPage({ data, mdxSource }) {
  return (
    <>
      <h1>{data.title}</h1>
      {hydrate(mdxSource, MDX_COMPONENTS)}
    </>
  )
}

export async function getStaticProps() {
  const fixturePath = path.join(process.cwd(), 'mdx/test.mdx')
  const { data, content } = matter(fs.readFileSync(fixturePath, 'utf8'))
  const mdxSource = await renderToString(content, MDX_COMPONENTS)
  return { props: { mdxSource, data } }
}
