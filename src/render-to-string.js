import { compile } from 'xdm'
import { MDXProvider, mdx as mdxReact } from '@mdx-js/react'
import { transformAsync } from '@babel/core'
import presetEnv from '@babel/preset-env'
import presetReact from '@babel/preset-react'
import pluginBrowser from './babel-plugin-mdx-browser'
import { reactRenderToString } from 'react-dom/server'
import React from 'react'

module.exports = function renderToString(
  source,
  { components = {}, mdxOptions = {}, scope = {}, provider } = {}
) {
  let jsSource
  // transform it into react
  return compile(source, { ...mdxOptions })
    .then((code) => {
      // mdx gives us back es6 code, we then need to transform into two formats:
      // - first a version we can render to string right now as a "serialized" result
      // - next a version that is fully browser-compatible that we can eval to rehydrate
      return Promise.all([
        // this one is for immediate evaluation so we can renderToString below
        transformAsync(code, {
          presets: [[presetReact, { runtime: 'automatic' }], presetEnv],
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
      // evaluate the code
      // NOTES:
      // - relative imports can't be expected to work with remote files, we'd need
      //   an extra babel transform to be able to import specific file paths
      jsSource = later.code
      return new Function(
        'components',
        ...Object.keys(scope),
        `${now.code}
    return React.createElement(MDXProvider, { components },
      React.createElement(MDXContent, {})
    );`
      )(components, ...Object.values(scope))
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
