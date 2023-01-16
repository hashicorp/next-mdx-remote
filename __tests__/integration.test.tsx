import { Server } from 'http'
import { Browser } from 'puppeteer'

import spawn from 'cross-spawn'
import path from 'path'
import fs from 'fs'
import puppeteer from 'puppeteer'
import handler from 'serve-handler'
import http from 'http'
import rmfr from 'rmfr'
import * as cheerio from 'cheerio'
import { ChildProcess } from 'child_process'

jest.setTimeout(30000)

describe('hydration - production', () => {
  beforeAll(() => {
    buildFixture('basic')
  })

  afterAll(async () => {
    await cleanupNextDirectory('basic')
  })

  test('server rendered output', () => {
    const result = readOutputFile('basic', 'index')
    const $ = cheerio.load(result)

    const htmlOutput = $('#__next').html()

    // server renders correctly
    expect(htmlOutput).toContain(`<h1>foo</h1>`)
    expect(htmlOutput).toContain(`<h2>Headline</h2>`)
    expect(htmlOutput).toContain(`<p>hello <!-- -->jeff</p>`)
    expect(htmlOutput).toContain(`<button>Count: <!-- -->0</button>`)
    expect($('.context').text()).toBe('Context value: "foo"')
    expect(htmlOutput).toContain(
      `<p>Some <strong class=\"custom-strong\">markdown</strong> content</p>`
    )
    expect(htmlOutput).toContain(
      `<div class=\"alert alert-warning g-type-body\"><p>Alert</p></div>`
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

describe('hydration - dev server', () => {
  let childProcess
  let browser: Browser

  beforeAll(async () => {
    childProcess = await startDevServer('basic')
    browser = await puppeteer.launch()
  })

  afterAll(async () => {
    // close the browser and dev server
    await stopDevServer(childProcess)
    await browser.close()
    await cleanupNextDirectory('basic')
  })

  test('loads in development', async () => {
    const page = await browser.newPage()
    page.on('console', (msg) => console.log(msg.text()))

    await page.goto('http://localhost:12333')

    // @ts-expect-error
    await page.waitForFunction(() => Boolean(window.__NEXT_HYDRATED))

    // @ts-expect-error -- el is typed as Element, but reasonable to assume it is an HTMLElement at this point
    const headingText = await page.$eval('h1', (el) => el.innerText)

    expect(headingText).toEqual('foo')
  })
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

async function cleanupNextDirectory(fixture: string) {
  await rmfr(path.join(__dirname, `fixtures/${fixture}/out`))
  await rmfr(path.join(__dirname, `fixtures/${fixture}/.next`))
}

async function startDevServer(fixture: string) {
  const dir = path.join(__dirname, 'fixtures', fixture)

  const childProcess = spawn('next', ['dev', '-p', '12333'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: dir,
    env: { ...process.env, NODE_ENV: 'development', __NEXT_TEST_MODE: 'true' },
  })

  childProcess.stderr?.on('data', (chunk) => {
    process.stdout.write(chunk)
  })

  async function waitForStarted() {
    return new Promise<undefined>((resolve) => {
      childProcess.stdout?.on('data', (chunk) => {
        const msg = chunk.toString()
        process.stdout.write(chunk)

        if (msg.includes('started server on') && msg.includes('url:')) {
          resolve(undefined)
        }
      })
    })
  }

  await waitForStarted()

  return childProcess
}

async function stopDevServer(childProcess: ChildProcess) {
  console.log('stopping development server...')
  const promise = new Promise((resolve) => {
    childProcess.on('close', () => {
      console.log('development server stopped')
      resolve(undefined)
    })
  })

  childProcess.kill('SIGINT')

  await promise
}
