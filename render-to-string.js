const mdx = require('@mdx-js/mdx')
const { MDXProvider } = require('@mdx-js/react')
const { transformAsync } = require('@babel/core')
const presetEnv = require('@babel/preset-env')
const presetReact = require('@babel/preset-react')
const pluginBrowser = require('./babel-plugin-mdx-browser')
const nodeEval = require('require-from-string')
const reactRenderToString = require('react-dom/server').renderToString
const React = require('react')

module.exports = function renderToString(source, components) {
  let jsSource
  // transform it into react
  const renderer = `
import React from 'react'
import { mdx } from '@mdx-js/react'
`
  return mdx(source)
    .then((jsx) => {
      return `${renderer}\n${jsx}`
    })
    .then((code) => {
      // mdx gives us back es6 code, we then need to transform into two formats:
      // - first a version we can render to string right now as a "serialized" result
      // - next a version that is fully browser-compatible that we can eval to rehydrate
      return Promise.all([
        // this one is for immediate evaluation so we can renderToString below
        transformAsync(code, {
          presets: [presetReact, presetEnv],
        }),
        // this one is for the browser to eval and rehydrate, later
        transformAsync(code, {
          presets: [presetReact, presetEnv],
          plugins: [pluginBrowser],
        }),
      ])
    })
    .then(([now, later]) => {
      // evaluate the code
      // NOTES:
      // - relative imports can't be expected to work with remote files, we'd need
      //   an extra babel transform to be able to import specific file paths
      jsSource = later.code
      // problem here is that we don't have the components available, AND mdx
      return nodeEval(now.code).default
    })
    .then((component) => {
      return {
        source: jsSource,
        // react: render to string
        renderedOutput: reactRenderToString(
          React.createElement(
            MDXProvider,
            {
              components,
            },
            component({})
          )
        ),
      }
    })
}
