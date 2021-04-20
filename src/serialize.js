import mdx from '@mdx-js/mdx'
import { transformAsync } from '@babel/core'
import presetEnv from '@babel/preset-env'
import pluginReactJsx from '@babel/plugin-transform-react-jsx'
import pluginBrowser from './babel-plugin-mdx-browser'

export default async function serialize(source, { mdxOptions = {} } = {}) {
  const compiledMdx = await mdx(source, { ...mdxOptions, skipExport: true })
  const transpiledSource = await transformAsync(compiledMdx, {
    presets: [presetEnv],
    plugins: [pluginReactJsx, pluginBrowser],
    configFile: false,
  })

  return {
    compiledSource: transpiledSource.code,
  }
}
