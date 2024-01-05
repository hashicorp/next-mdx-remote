/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Server } from 'http'
import * as cheerio from 'cheerio'

import {
  buildFixture,
  cleanupTmpTestDir,
  createTmpTestDir,
  readOutputFile,
  serveStatic,
  startDevServer,
  stopDevServer,
} from '../.jest/utils'
import { ChildProcess } from 'child_process'

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import puppeteer, { Browser } from 'puppeteer'

vi.setConfig({ testTimeout: 30_000 })

describe('hydration - production', () => {
  let tmpDir: string
  let browser: Browser

  beforeAll(async () => {
    tmpDir = await createTmpTestDir('basic')
    browser = await puppeteer.launch()
    buildFixture(tmpDir)
  })

  afterAll(async () => {
    await browser.close()
    await cleanupTmpTestDir(tmpDir)
  })

  test('server rendered output', () => {
    const result = readOutputFile(tmpDir, 'index')
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
    expect(htmlOutput).toContain(`<p>🎉</p>`)
  })

  test('rehydrates correctly in browser', async () => {
    // hydrates correctly
    let server: Server
    const page = await browser.newPage()
    page.on('console', (msg) => console.log(msg.text()))
    server = await serveStatic(tmpDir)

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
    await new Promise((resolve) => server.close(resolve))
  })
})

describe('hydration - dev server', () => {
  let childProcess: ChildProcess
  let tmpDir: string
  let browser: Browser

  beforeAll(async () => {
    tmpDir = await createTmpTestDir('basic')
    childProcess = await startDevServer(tmpDir)
    browser = await puppeteer.launch()
    buildFixture(tmpDir)
  })

  afterAll(async () => {
    // close the browser and dev server
    await stopDevServer(childProcess)
    await browser.close()
    await cleanupTmpTestDir(tmpDir)
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

describe('hydration - dev server - rsc', () => {
  let childProcess: ChildProcess
  let tmpDir: string
  let browser: Browser

  beforeAll(async () => {
    tmpDir = await createTmpTestDir('rsc')
    childProcess = await startDevServer(tmpDir)
    browser = await puppeteer.launch()
    buildFixture(tmpDir)
  })

  afterAll(async () => {
    // close the browser and dev server
    await stopDevServer(childProcess)
    await browser.close()
    await cleanupTmpTestDir(tmpDir)
  })

  test.each(['/app-dir-mdx/mdxremote', '/app-dir-mdx/compile-mdx'])(
    '%s',
    async (path) => {
      const page = await browser.newPage()
      page.on('console', (msg) => console.log(msg.text()))

      await page.goto(`http://localhost:12333${path}`)

      // @ts-expect-error
      await page.waitForFunction(() => Boolean(window.__NEXT_HYDRATED))

      // @ts-expect-error -- el is typed as Element, but reasonable to assume it is an HTMLElement at this point
      const headingText = await page.$eval('h1', (el) => el.innerText)

      expect(headingText).toEqual('foo')
    }
  )
})
