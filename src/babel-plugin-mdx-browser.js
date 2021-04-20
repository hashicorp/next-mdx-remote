module.exports = function BabelPluginMdxBrowser() {
  return {
    visitor: {
      // remove all imports, we will add these to scope manually
      ImportDeclaration(path) {
        path.remove()
      },
    },
  }
}
