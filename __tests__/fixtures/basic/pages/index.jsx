import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import serialize from '../../../../serialize'
import MdxRemote from '../../../../mdx-remote'
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
      <MdxRemote source={mdxSource} components={MDX_COMPONENTS} scope={data} />
    </>
  )
}

export async function getStaticProps() {
  const fixturePath = path.join(process.cwd(), 'mdx/test.mdx')
  const { data, content } = matter(fs.readFileSync(fixturePath, 'utf8'))
  const mdxSource = await serialize(content, {
    mdxOptions: { remarkPlugins: [paragraphCustomAlerts] },
  })
  return { props: { mdxSource, data } }
}
