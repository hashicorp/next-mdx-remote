import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'
import * as MDX from '@mdx-js/react'

import { MDXRemote, MDXProvider } from '../src/index'
import { serialize } from '../src/serialize'
import { renderStatic } from '../.jest/utils'

describe('serialize', () => {
  test('minimal', async () => {
    const result = await renderStatic('foo **bar**')
    expect(result).toMatchInlineSnapshot(`"<p>foo <strong>bar</strong></p>"`)
  })

  test('with component', async () => {
    const result = await renderStatic('foo <Test name="test" />', {
      components: {
        Test: ({ name }) => <span>hello {name}</span>,
      },
    })
    expect(result).toMatchInlineSnapshot(`"<p>foo <span>hello test</span></p>"`)
  })

  test('with options', async () => {
    const options = {
      mdxOptions: {
        remarkPlugins: [paragraphCustomAlerts],
      },
    }
    const result = await renderStatic('~> hello', options)
    expect(result).toMatchInlineSnapshot(
      `"<div class=\\"alert alert-warning g-type-body\\"><p>hello</p></div>"`
    )
    expect(options.mdxOptions.remarkPlugins.length).toBe(1)
  })

  test('with scope', async () => {
    const result = await renderStatic('<Test name={bar} />', {
      components: {
        Test: ({ name }: { name: string }) => <p>{name}</p>,
      },
      scope: {
        bar: 'test',
      },
    })
    expect(result).toMatchInlineSnapshot(`"<p>test</p>"`)
  })

  test('with custom provider', async () => {
    const TestContext = React.createContext(null)

    const mdxSource = await serialize('<Test />')

    const result = ReactDOMServer.renderToStaticMarkup(
      <TestContext.Provider value="provider-value">
        <MDXRemote
          {...mdxSource}
          components={{
            Test: () => (
              <TestContext.Consumer>
                {(value) => <p>{value}</p>}
              </TestContext.Consumer>
            ),
          }}
        />
      </TestContext.Provider>
    )

    expect(result).toMatchInlineSnapshot(`"<p>provider-value</p>"`)
  })

  test('with MDXProvider providing custom components', async () => {
    const mdxSource = await serialize('<Test />')

    const result = ReactDOMServer.renderToStaticMarkup(
      <MDXProvider
        components={{
          Test: () => <p>Hello world</p>,
        }}
      >
        <MDXRemote {...mdxSource} />
      </MDXProvider>
    )

    expect(result).toMatchInlineSnapshot(`"<p>Hello world</p>"`)
  })

  test('supports component names with a .', async () => {
    const mdxSource = await serialize('<motion.p />')

    const result = ReactDOMServer.renderToStaticMarkup(
      <MDXRemote
        {...mdxSource}
        components={{
          motion: { p: () => <p>Hello world</p> },
        }}
      />
    )

    expect(result).toMatchInlineSnapshot(`"<p>Hello world</p>"`)
  })

  test('strips imports & exports', async () => {
    const result = await renderStatic(`import foo from 'bar'

foo **bar**

export const bar = 'bar'`)
    expect(result).toMatchInlineSnapshot(`"<p>foo <strong>bar</strong></p>"`)
  })

  test('fragments', async () => {
    const components = {
      Test: ({ content }) => content,
    }

    const result = await renderStatic(
      `<Test content={<>Rendering a fragment</>} />`,
      { components }
    )
    expect(result).toMatchInlineSnapshot(`"Rendering a fragment"`)
  })

  test('parses frontmatter - serialize result', async () => {
    const result = await serialize(
      `---
hello: world
---

# Hello`,
      { parseFrontmatter: true }
    )

    expect(result.frontmatter.hello).toEqual('world')
  })

  test('parses frontmatter - rendered result', async () => {
    const result = await renderStatic(
      `---
hello: world
---

# Hello {frontmatter.hello}`,
      { parseFrontmatter: true }
    )

    expect(result).toMatchInlineSnapshot(`"<h1>Hello world</h1>"`)
  })

  test('prints helpful message from compile error', async () => {
    try {
      await serialize(`This is very bad <GITHUB_USER>`)
    } catch (error) {
      expect(error).toMatchInlineSnapshot(`
        [Error: [next-mdx-remote] error compiling MDX:
        Cannot close \`paragraph\` (1:1-1:31): a different token (\`mdxJsxTextTag\`, 1:18-1:31) is open

        > 1 | This is very bad <GITHUB_USER>
            |                  ^

        More information: https://mdxjs.com/docs/troubleshooting-mdx]
      `)
    }
  })
})
