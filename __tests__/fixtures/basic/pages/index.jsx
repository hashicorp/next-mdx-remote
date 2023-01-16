import fs from 'fs'
import path from 'path'
import { createContext, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { serialize } from '../../../../serialize'
import { MDXRemote } from '../../../../'
import Test from '../components/test'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'

const TestContext = createContext('test')
const PROVIDER = {
  component: TestContext.Provider,
  props: { value: 'foo' },
}

const MDX_COMPONENTS = {
  Test,
  ContextConsumer: () => {
    return (
      <TestContext.Consumer>
        {(value) => <p className="context">Context value: "{value}"</p>}
      </TestContext.Consumer>
    )
  },
  strong: (props) => <strong className="custom-strong" {...props} />,
  Dynamic: dynamic(() => import('../components/dynamic')),
}

export default function TestPage({ mdxSource }) {
  const [providerOptions, setProviderOptions] = useState(PROVIDER)

  useEffect(() => {
    setProviderOptions({
      ...PROVIDER,
      props: {
        value: 'bar',
      },
    })
  }, [])

  return (
    <>
      <h1>{mdxSource.frontmatter.title}</h1>
      <TestContext.Provider {...providerOptions.props}>
        <MDXRemote {...mdxSource} components={MDX_COMPONENTS} />
      </TestContext.Provider>
    </>
  )
}

export async function getStaticProps() {
  const fixturePath = path.join(process.cwd(), 'mdx/test.mdx')
  const source = await fs.promises.readFile(fixturePath, 'utf8')

  const mdxSource = await serialize(source, {
    mdxOptions: { remarkPlugins: [paragraphCustomAlerts] },
    parseFrontmatter: true,
  })

  return { props: { mdxSource } }
}
