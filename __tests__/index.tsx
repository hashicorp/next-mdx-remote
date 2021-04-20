import { Server } from 'http'
import { Browser } from 'puppeteer'

import spawn from 'cross-spawn'
import path from 'path'
import fs from 'fs'
import puppeteer from 'puppeteer'
import handler from 'serve-handler'
import http from 'http'
import rmfr from 'rmfr'
import ReactDOMServer from 'react-dom/server'
import React from 'react'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'
import * as MDX from '@mdx-js/react'

import MDXRemote from '../mdx-remote'
import serialize from '../serialize'

jest.setTimeout(30000)

describe('hydration', () => {
  beforeAll(() => {
    buildFixture('basic')
  })

  test('server rendered output', () => {
    const result = readOutputFile('basic', 'index')

    // server renders correctly
    expect(result).toMatch(
      '<h1>foo</h1><div><h1>Headline</h1><p>hello <!-- -->jeff</p><button>Count: <!-- -->0</button><p class="context">Context value: &quot;<!-- -->foo<!-- -->&quot;</p><p>Some <strong class="custom-strong">markdown</strong> content</p><div class="alert alert-warning g-type-body" role="alert"><p>Alert</p></div></div></div>'
    )
  })

  test('rehydrates correctly in browser', async () => {
    // hydrates correctly
    let browser: Browser, server: Server
    browser = await puppeteer.launch()
    const page = await browser.newPage()
    page.on('console', (msg) => console.log(msg.text()))
    server = await serveStatic('basic')

    await page.goto('http://localhost:1235')

    // @ts-expect-error
    await page.waitForFunction(() => Boolean(window.__NEXT_HYDRATED))

    await page.waitForSelector('button')

    // click the button
    await page.click('button')

    // wait for react to render
    await page.waitForFunction(() => {
      return document.querySelector('button')?.innerHTML === 'Count: 1'
    })

    // pull text for elements we're testing hydrate on
    const contextElementText = await page.$eval(
      '.context',
      (el) => el.innerHTML
    )
    const buttonText = await page.$eval('button', (el) => el.innerHTML)

    expect(buttonText).toEqual('Count: 1')
    expect(contextElementText).toEqual('Context value: "bar"')

    // close the browser and dev server
    await browser.close()
    await new Promise((resolve) => server.close(resolve))
  })
})

describe('serialize', () => {
  test('minimal', async () => {
    const result = await renderStatic('foo **bar**')
    expect(result).toMatchInlineSnapshot(
      `"<div><p>foo <strong>bar</strong></p></div>"`
    )
  })

  test('with component', async () => {
    const result = await renderStatic('foo <Test name="test" />', {
      components: {
        Test: ({ name }) => React.createElement('span', null, `hello ${name}`),
      },
    })
    expect(result).toMatchInlineSnapshot(
      `"<div><p>foo <span>hello test</span></p></div>"`
    )
  })

  test('with options', async () => {
    const result = await renderStatic('~> hello', {
      mdxOptions: {
        remarkPlugins: [paragraphCustomAlerts],
      },
    })
    expect(result).toMatchInlineSnapshot(
      `"<div><div class=\\"alert alert-warning g-type-body\\" role=\\"alert\\"><p>hello</p></div></div>"`
    )
  })

  test('with scope', async () => {
    const result = await renderStatic('<Test name={bar} />', {
      components: {
        Test: ({ name }: { name: string }) =>
          React.createElement('p', null, name),
      },
      scope: {
        bar: 'test',
      },
    })
    expect(result).toMatchInlineSnapshot(`"<div><p>test</p></div>"`)
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

    expect(result).toMatchInlineSnapshot(`"<div><p>provider-value</p></div>"`)
  })

  test('with MDXProvider providing custom components', async () => {
    const TestContext = React.createContext(null)

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

    expect(result).toMatchInlineSnapshot(`"<div><p>Hello world</p></div>"`)
  })
})

afterAll(async () => {
  await rmfr(path.join(__dirname, 'fixtures/basic/out'))
  await rmfr(path.join(__dirname, 'fixtures/basic/.next'))
})

//
// utility functions
//

function buildFixture(fixture: string) {
  spawn.sync('next', ['build'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'fixtures', fixture),
    env: { ...process.env, NODE_ENV: undefined, __NEXT_TEST_MODE: 'true' },
  })
  spawn.sync('next', ['export'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'fixtures', fixture),
    env: { ...process.env, NODE_ENV: undefined, __NEXT_TEST_MODE: 'true' },
  })
}

function readOutputFile(fixture: string, name: string) {
  return fs.readFileSync(
    path.join(__dirname, 'fixtures', fixture, 'out', `${name}.html`),
    'utf8'
  )
}

function serveStatic(fixture: string): Promise<Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) =>
      handler(req, res, {
        public: path.join(__dirname, 'fixtures', fixture, 'out'),
      })
    )
    server.listen(1235, () => resolve(server))
  })
}

async function renderStatic(
  mdx: string,
  {
    components,
    scope,
    mdxOptions,
  }: {
    components?: Record<string, React.ReactNode>
    scope?: Record<string, unknown>
    mdxOptions?: Record<string, unknown>
  } = {}
): Promise<string> {
  const mdxSource = await serialize(mdx, { mdxOptions })

  return ReactDOMServer.renderToStaticMarkup(
    <MDXRemote {...mdxSource} components={components} scope={scope} />
  )
}
