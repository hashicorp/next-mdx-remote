import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'
import * as MDX from '@mdx-js/react'

import { MDXRemote } from '../src/index'
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
    const result = await renderStatic('~> hello', {
      mdxOptions: {
        remarkPlugins: [paragraphCustomAlerts],
      },
    })
    expect(result).toMatchInlineSnapshot(
      `"<div class=\\"alert alert-warning g-type-body\\"><p>hello</p></div>"`
    )
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
      <MDX.MDXProvider
        components={{
          Test: () => <p>Hello world</p>,
        }}
      >
        <MDXRemote {...mdxSource} />
      </MDX.MDXProvider>
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

  test('minifies when minify: true', async () => {
    const mdx = `import fooBar from 'bar'

    foo **bar**
    
    export const bar = 'foo'`

    const resultA = await serialize(mdx, { minify: true })
    const resultB = await serialize(mdx)

    expect(resultA).not.toEqual(resultB)
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
})
