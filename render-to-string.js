const mdx = require('@mdx-js/mdx')
const { transformAsync } = require('@babel/core')
const presetReact = require('@babel/preset-react')
const presetMinify = require('babel-preset-minify')
const pluginBrowser = require('./babel-plugin-mdx-browser')

// NOTES:
// - relative imports can't be expected to work with remote files, we'd need
//   an extra babel transform to be able to import specific file paths
module.exports = function renderToString(source, { mdxOptions } = {}) {
  // transform it into react
  return mdx(source, { ...mdxOptions, skipExport: true })
    .then((code) => {
      // mdx gives us back es6 code with JSX, we now need to make it browser-compatible:
      return transformAsync(code, {
        presets: [[presetReact, { useBuiltIns: true }], presetMinify],
        plugins: [pluginBrowser],
        configFile: false,
      })
    })
    .then((file) => {
      // The first line is: /* @jsx mdx */ - We can save some bytes by removing it
      return file.code.replace(/^\/* @jsx mdx *\//, '')
    })
}
