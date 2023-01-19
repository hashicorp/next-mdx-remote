import fs from 'fs'
import path from 'path'
import dynamic from 'next/dynamic'
import Test from '../../../components/test'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'
import { Provider, Consumer } from '../provider'
import { compileMDX } from 'next-mdx-remote/rsc'

const MDX_COMPONENTS = {
  Test,
  ContextConsumer: Consumer,
  strong: (props) => <strong className="custom-strong" {...props} />,
  Dynamic: dynamic(() => import('../../../components/dynamic')),
}

export default async function Page() {
  const fixturePath = path.join(process.cwd(), 'mdx/test.mdx')
  const source = await fs.promises.readFile(fixturePath, 'utf8')

  const { content, frontmatter } = await compileMDX({
    source,
    components: MDX_COMPONENTS,
    options: {
      mdxOptions: { remarkPlugins: [paragraphCustomAlerts] },
      parseFrontmatter: true,
    },
  })

  return (
    <>
      <h1>{frontmatter.title}</h1>
      <Provider>{content}</Provider>
    </>
  )
}
