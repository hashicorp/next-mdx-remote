/**
 * Allow jsx-runtime to be successfully imported from either React 17 or React 18.
 *
 * Inspired by the approach here: https://github.com/contentlayerdev/contentlayer/blob/main/packages/next-contentlayer/src/hooks/jsx-runtime.cjs
 */
const jsxRuntime = require('react/jsx-runtime')

module.exports.jsxRuntime = jsxRuntime
