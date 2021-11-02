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
import * as cheerio from 'cheerio'

import { MDXRemote, MDXRemoteProps } from '../src/index'
import { serialize } from '../src/serialize'
import { SerializeOptions } from '../src/types'

jest.setTimeout(30000)

describe('hydration', () => {
  beforeAll(() => {
    buildFixture('basic')
  })

  test('server rendered output', () => {
    const result = readOutputFile('basic', 'index')
    const $ = cheerio.load(result)

    // server renders correctly
    expect($('#__next').html()).toEqual(`<h1>foo</h1><h1>Headline</h1>
<p>hello <!-- -->jeff</p><button>Count: <!-- -->0</button>
<p class=\"context\">Context value: \"<!-- -->foo<!-- -->\"</p>
<p>Some <strong class=\"custom-strong\">markdown</strong> content</p>
<div class=\"alert alert-warning g-type-body\"><p>Alert</p></div>
<div>I am a dynamic component.</div>`)
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
      return document.querySelector('button')?.innerText === 'Count: 1'
    })

    // pull text for elements we're testing hydrate on
    const contextElementText = await page.$eval(
      '.context',
      // @ts-expect-error -- el is typed as Element, but reasonable to assume it is an HTMLElement at this point
      (el) => el.innerText
    )
    // @ts-expect-error -- el is typed as Element, but reasonable to assume it is an HTMLElement at this point
    const buttonText = await page.$eval('button', (el) => el.innerText)

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
    expect(result).toMatchInlineSnapshot(`"<p>foo <strong>bar</strong></p>"`)
  })

  test('with component', async () => {
    const result = await renderStatic('foo <Test name="test" />', {
      components: {
        Test: ({ name }) => React.createElement('span', null, `hello ${name}`),
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
        Test: ({ name }: { name: string }) =>
          React.createElement('p', null, name),
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
    target,
  }: SerializeOptions & Pick<MDXRemoteProps, 'components'> = {}
): Promise<string> {
  const mdxSource = await serialize(mdx, { mdxOptions, target })

  return ReactDOMServer.renderToStaticMarkup(
    <MDXRemote {...mdxSource} components={components} scope={scope} />
  )
}
