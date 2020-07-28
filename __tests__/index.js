const spawn = require('cross-spawn')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer')
const handler = require('serve-handler')
const http = require('http')
const rmfr = require('rmfr')
const renderToString = require('../render-to-string')
const React = require('react')
const { paragraphCustomAlerts } = require('@hashicorp/remark-plugins')

jest.setTimeout(30000)

test('rehydrates correctly in browser', () => {
  buildFixture('basic')
  const result = readOutputFile('basic', 'index')

  // server renders correctly
  expect(result).toMatch(
    '<h1>foo</h1><span><h1>Headline</h1><p>hello <!-- -->jeff</p><button>Count: <!-- -->0</button><p>Some <strong class="custom-strong">markdown</strong> content</p><div class="alert alert-warning g-type-body" role="alert"><p>Alert</p></div></span>'
  )
  // hydrates correctly
  let browser, server
  return new Promise(async (resolve) => {
    browser = await puppeteer.launch()
    const page = await browser.newPage()
    page.on('console', (msg) => console.log(msg.text()))
    server = await serveStatic('basic')
    await page.exposeFunction('__NEXT_HYDRATED_CB', async () => {
      // click the button, flakes with one click for some reason
      await page.click('button')
      await page.click('button')
      // wait for react to render
      await page.waitFor(() => {
        return document.querySelector('button').innerText !== 'Count: 0'
      })
      // pull the text for a test confirm
      const buttonCount = page.$eval('button', (el) => el.innerText)
      resolve(buttonCount)
    })
    await page.goto('http://localhost:1235', { waitUntil: 'domcontentloaded' })
  }).then(async (buttonText) => {
    expect(buttonText).not.toEqual('Count: 0')

    // close the browser and dev server
    await browser.close()
    return new Promise((resolve) => server.close(resolve))
  })
})

test('renderToString minimal', async () => {
  const result = await renderToString('foo **bar**')
  expect(result.renderedOutput).toEqual('<p>foo <strong>bar</strong></p>')
})

test('renderToString with component', async () => {
  const result = await renderToString('foo <Test />', {
    components: {
      Test: () => React.createElement('span', null, 'hello world'),
    },
  })
  expect(result.renderedOutput).toEqual('<p>foo <span>hello world</span></p>')
})

test('renderToString with options', async () => {
  const result = await renderToString('~> hello', {
    mdxOptions: {
      remarkPlugins: [paragraphCustomAlerts],
    },
  })
  expect(result.renderedOutput).toEqual(
    '<div class="alert alert-warning g-type-body" role="alert"><p>hello</p></div>'
  )
})

test('renderToString with scope', async () => {
  const result = await renderToString('<Test name={bar} />', {
    components: { Test: ({ name }) => React.createElement('p', null, name) },
    scope: {
      bar: 'test',
    },
  })
  expect(result.renderedOutput).toEqual('<p>test</p>')
})

afterAll(async () => {
  await rmfr(path.join(__dirname, 'fixtures/basic/out'))
  await rmfr(path.join(__dirname, 'fixtures/basic/.next'))
})

//
// utility functions
//

function buildFixture(fixture) {
  spawn.sync('next', ['build'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'fixtures', fixture),
    env: { ...process.env, NODE_ENV: undefined, __NEXT_TEST_MODE: true },
  })
  spawn.sync('next', ['export'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, 'fixtures', fixture),
    env: { ...process.env, NODE_ENV: undefined, __NEXT_TEST_MODE: true },
  })
}

function readOutputFile(fixture, name) {
  return fs.readFileSync(
    path.join(__dirname, 'fixtures', fixture, 'out', `${name}.html`),
    'utf8'
  )
}

function serveStatic(fixture) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) =>
      handler(req, res, {
        public: path.join(__dirname, 'fixtures', fixture, 'out'),
      })
    )
    server.listen(1235, () => resolve(server))
  })
}
