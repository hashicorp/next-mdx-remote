import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { createContext, useEffect, useState } from 'react'
import serialize from '../../../../serialize'
import MDXRemote from '../../../../mdx-remote'
import Test from '../components/test'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'

const TestContext = createContext('test')
const PROVIDER = {
  component: TestContext.Provider,
  props: { value: 'foo' },
}
const ContextConsumer = () => {
  return (
    <TestContext.Consumer>
      {(value) => <p className="context">Context value: "{value}"</p>}
    </TestContext.Consumer>
  )
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
}

export default function TestPage({ data, mdxSource }) {
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
      <h1>{data.title}</h1>
      <TestContext.Provider {...providerOptions.props}>
        <MDXRemote
          {...mdxSource}
          components={MDX_COMPONENTS}
          scope={data}
          lazy
        />
      </TestContext.Provider>
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
