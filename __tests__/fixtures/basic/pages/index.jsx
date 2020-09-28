import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import renderToString from '../../../../render-to-string'
import hydrate from '../../../../hydrate'
import Test from '../components/test'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'

const MDX_COMPONENTS = {
  Test,
  strong: (props) => <strong className="custom-strong" {...props} />,
}

export default function TestPage({ data, mdxSource }) {
  return (
    <>
      <h1>{data.title}</h1>
      {hydrate(mdxSource, { components: MDX_COMPONENTS }, { scope: data })}
    </>
  )
}

export async function getStaticProps() {
  const fixturePath = path.join(process.cwd(), 'mdx/test.mdx')
  const { data, content } = matter(fs.readFileSync(fixturePath, 'utf8'))
  const mdxSource = await renderToString(content, {
    mdxOptions: { remarkPlugins: [paragraphCustomAlerts] },
  })
  return { props: { mdxSource, data } }
}
