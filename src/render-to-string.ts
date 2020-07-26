import mdx, { Options } from '@mdx-js/mdx'
import { MDXProvider, mdx as mdxReact } from '@mdx-js/react'
import { transformAsync } from '@babel/core'
import presetEnv from '@babel/preset-env'
import presetReact from '@babel/preset-react'
import { renderToString as reactRenderToString } from 'react-dom/server'
import React from 'react'
import pluginBrowser from './babel-plugin-mdx-browser'
import { Components, Scope } from './types'

export default async function renderToString(
  source: string,
  components?: Components,
  options?: Options,
  scope: Scope = {}
) {
  // transform it into react
  const code = await mdx(source, { ...options, skipExport: true })
  const [now, later] = await Promise.all([
    // this one is for immediate evaluation so we can renderToString below
    transformAsync(code, {
      presets: [presetReact, presetEnv],
      configFile: false,
    }),
    // this one is for the browser to eval and rehydrate, later
    transformAsync(code, {
      presets: [presetReact, presetEnv],
      plugins: [pluginBrowser],
      configFile: false,
    }),
  ])

  if (!now || !later) {
    throw new Error('Failed to transform mdx source code')
  }

  // evaluate the code
  // NOTES:
  // - relative imports can't be expected to work with remote files, we'd need
  //   an extra babel transform to be able to import specific file paths
  const component = new Function(
    'React',
    'MDXProvider',
    'mdx',
    'components',
    ...Object.keys(scope),
    `${now.code}
return React.createElement(MDXProvider, { components },
  React.createElement(MDXContent, {})
);`
  )(React, MDXProvider, mdxReact, components, ...Object.values(scope))

  return {
    source: later.code,
    // react: render to string
    renderedOutput: reactRenderToString(component),
    scope,
  }
}
