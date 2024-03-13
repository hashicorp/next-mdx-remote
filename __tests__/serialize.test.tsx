/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'
import * as MDX from '@mdx-js/react'
import { VFile } from 'vfile'

import { MDXRemote } from '../'
import { serialize } from '../serialize'
import { renderStatic } from './utils'

import { describe, test, expect } from 'vitest'

interface Frontmatter {
  hello: string
}

describe('serialize', () => {
  test('minimal', async () => {
    const result = await renderStatic('foo **bar**')
    expect(result).toMatchInlineSnapshot(`"<p>foo <strong>bar</strong></p>"`)
  })

  test('with component', async () => {
    const result = await renderStatic('foo <Test name="test" />', {
      components: {
        Test: ({ name }: { name: string }) => <span>hello {name}</span>,
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
      `"<div class=\"alert alert-warning g-type-body\"><p>hello</p></div>"`
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
    const TestContext = React.createContext<null | string>(null)

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

  test('fragments', async () => {
    const components = {
      Test: ({ content }: { content: string }) => <>{content}</>,
    }

    const result = await renderStatic(
      `<Test content={<>Rendering a fragment</>} />`,
      { components }
    )
    expect(result).toMatchInlineSnapshot(`"Rendering a fragment"`)
  })

  test('parses frontmatter - serialize result', async () => {
    const result = await serialize<Record<string, unknown>, Frontmatter>(
      `---
hello: world
---

# Hello`,
      { parseFrontmatter: true }
    )

    // Validating type correctness here, this should not error
    expect(<MDXRemote {...result} />).toBeTruthy()

    expect(result.frontmatter?.hello).toEqual('world')
  })

  test('parses frontmatter - serialize result - no types', async () => {
    const result = await serialize(
      `---
hello: world
---

# Hello`,
      { parseFrontmatter: true }
    )

    // Validating type correctness here, this should not error
    expect(<MDXRemote {...result} />).toBeTruthy()

    expect(result.frontmatter?.hello).toEqual('world')
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
        Expected a closing tag for \`<GITHUB_USER>\` (1:18-1:31) before the end of \`paragraph\`

        > 1 | This is very bad <GITHUB_USER>
            |                  ^

        More information: https://mdxjs.com/docs/troubleshooting-mdx]
      `)
    }
  })

  test('supports VFile', async () => {
    const result = await renderStatic(new VFile('foo **bar**'))
    expect(result).toMatchInlineSnapshot(`"<p>foo <strong>bar</strong></p>"`)
  })

  test('supports Buffer', async () => {
    const result = await renderStatic(Buffer.from('foo **bar**'))
    expect(result).toMatchInlineSnapshot(`"<p>foo <strong>bar</strong></p>"`)
  })
})
