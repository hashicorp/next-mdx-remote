import { Server } from 'http'
import { Browser } from 'puppeteer'

import spawn from 'cross-spawn'
import path from 'path'
import fs from 'fs'
import puppeteer from 'puppeteer'
import handler from 'serve-handler'
import http from 'http'
import rmfr from 'rmfr'
import renderToString from '../render-to-string'
import React from 'react'
import { paragraphCustomAlerts } from '@hashicorp/remark-plugins'

jest.setTimeout(30000)

describe('hydration', () => {
  beforeAll(() => {
    buildFixture('basic')
  })

  test('server rendered output', () => {
    const result = readOutputFile('basic', 'index')

    // server renders correctly
    expect(result).toMatch(
      '<h1>foo</h1><div><h1>Headline</h1><p>hello <!-- -->jeff</p><button>Count: <!-- -->0</button><p class="context">Context value: &quot;<!-- -->foo<!-- -->&quot;</p><p>Some <strong class="custom-strong">markdown</strong> content</p><div class="alert alert-warning g-type-body" role="alert"><p>Alert</p></div></div>'
    )
  })

  test('rehydrates correctly in browser', async () => {
    // hydrates correctly
    let browser: Browser, server: Server
    return new Promise<string[]>(async (resolve) => {
      browser = await puppeteer.launch()
      const page = await browser.newPage()
      page.on('console', (msg) => console.log(msg.text()))
      server = await serveStatic('basic')
      await page.exposeFunction('__NEXT_HYDRATED_CB', async () => {
        // click the button
        await page.click('button')
        // wait for react to render
        await page.waitFor(() => {
          return document.querySelector('button')?.innerHTML === 'Count: 1'
        })
        // pull text for elements we're testing hydrate on
        const contextElementText = page.$eval('.context', (el) => el.innerHTML)
        const buttonText = page.$eval('button', (el) => el.innerHTML)

        resolve(Promise.all([buttonText, contextElementText]))
      })
      await page.goto('http://localhost:1235', {
        waitUntil: 'domcontentloaded',
      })
    }).then(async ([buttonText, contextElementText]) => {
      expect(buttonText).toEqual('Count: 1')
      expect(contextElementText).toEqual('Context value: "bar"')

      // close the browser and dev server
      await browser.close()
      return new Promise((resolve) => server.close(resolve))
    })
  })
})

describe('renderToString', () => {
  test('minimal', async () => {
    const result = await renderToString('foo **bar**')
    expect(result.renderedOutput).toEqual('<p>foo <strong>bar</strong></p>')
  })

  test('with component', async () => {
    const result = await renderToString('foo <Test name="test" />', {
      components: {
        Test: ({ name }) => React.createElement('span', null, `hello ${name}`),
      },
    })
    expect(result.renderedOutput).toEqual('<p>foo <span>hello test</span></p>')
  })

  test('with options', async () => {
    const result = await renderToString('~> hello', {
      mdxOptions: {
        remarkPlugins: [paragraphCustomAlerts],
      },
    })
    expect(result.renderedOutput).toEqual(
      '<div class="alert alert-warning g-type-body" role="alert"><p>hello</p></div>'
    )
  })

  test('with scope', async () => {
    const result = await renderToString('<Test name={bar} />', {
      components: {
        Test: ({ name }: { name: string }) =>
          React.createElement('p', null, name),
      },
      scope: {
        bar: 'test',
      },
    })
    expect(result.renderedOutput).toEqual('<p>test</p>')
  })

  test('with custom provider', async () => {
    const TestContext = React.createContext(null)

    const result = await renderToString('<Test />', {
      components: {
        Test: () =>
          React.createElement(TestContext.Consumer, null, (value) =>
            React.createElement('p', null, value)
          ),
      },
      provider: {
        component: TestContext.Provider,
        props: { value: 'provider-value' },
      },
    })

    expect(result.renderedOutput).toEqual('<p>provider-value</p>')
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
