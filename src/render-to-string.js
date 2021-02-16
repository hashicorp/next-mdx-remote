import { compile } from 'xdm'
import { MDXProvider, mdx as mdxReact } from '@mdx-js/react'
import { transformAsync } from '@babel/core'
import presetEnv from '@babel/preset-env'
import presetReact from '@babel/preset-react'
import pluginBrowser from './babel-plugin-mdx-browser'
import { renderToString as reactRenderToString } from 'react-dom/server'
import React from 'react'

module.exports = function renderToString(
  source,
  { components = {}, mdxOptions = {}, scope = {}, provider } = {}
) {
  let jsSource
  // transform it into react
  return compile(source, { ...mdxOptions })
    .then((code) => {
      console.log(String(code))
      // mdx gives us back es6 code, we then need to transform into two formats:
      // - first a version we can render to string right now as a "serialized" result
      // - next a version that is fully browser-compatible that we can eval to rehydrate
      return Promise.all([
        // this one is for immediate evaluation so we can renderToString below
        transformAsync(code, {
          presets: [[presetReact, { runtime: 'automatic' }], presetEnv],
          // TODO: add babel plugin for the server to remove exports
          plugins: [
            function RemoveExportPlugin() {
              return {
                visitor: {
                  // remove all imports, we will add these to scope manually
                  ImportDeclaration(path) {
                    path.remove()
                  },
                  // remove the default export
                  ExportDefaultDeclaration(path) {
                    path.replaceWith(path.node.declaration)
                  },
                },
              }
            },
          ],
          configFile: false,
        }),
        // this one is for the browser to eval and rehydrate, later
        transformAsync(code, {
          presets: [[presetReact, { runtime: 'automatic' }], presetEnv],
          plugins: [pluginBrowser],
          configFile: false,
        }),
      ])
    })
    .then(([now, later]) => {
      console.log(now.code)
      const { jsx, jsxs, Fragment } = require('react/jsx-runtime')
      // evaluate the code
      // NOTES:
      // - relative imports can't be expected to work with remote files, we'd need
      //   an extra babel transform to be able to import specific file paths
      jsSource = later.code
      return new Function(
        '_jsx',
        '_jsxs',
        '_Fragment',
        'components',
        ...Object.keys(scope),
        `${now.code}
    return _jsx(MDXContent, { components });`
      )(jsx, jsxs, Fragment, components, ...Object.values(scope))
    })
    .then((component) => {
      // if a custom provider was given, wrap it around the source
      if (provider)
        component = React.createElement(
          provider.component,
          provider.props || {},
          component
        )

      return {
        compiledSource: jsSource,
        // react: render to string
        renderedOutput: reactRenderToString(component),
        scope,
      }
    })
}
