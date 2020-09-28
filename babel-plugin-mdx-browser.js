const { types: t } = require('@babel/core')

module.exports = function BabelPluginMdxBrowser() {
  return {
    visitor: {
      // remove all imports, we will add these to scope manually
      ImportDeclaration(path) {
        path.remove()
      },
      // the `makeShortcode` template is nice for error handling but we
      // don't need it here as we are manually injecting dependencies
      VariableDeclaration(path) {
        // this removes the `makeShortcode` function
        if (path.node.declarations[0].id.name === 'makeShortcode') {
          path.remove()
        }

        // this removes any variable that is set using the `makeShortcode` function
        if (
          path.node &&
          path.node.declarations &&
          path.node.declarations[0] &&
          path.node.declarations[0].init &&
          path.node.declarations[0].init.callee &&
          path.node.declarations[0].init.callee.name === 'makeShortcode'
        ) {
          path.remove()
        }
      },
      // Add `components.` to every custom component. That way components that are outside
      // the MDX file can be rendered by using the components object
      JSXIdentifier(path) {
        if (
          path.node.name[0] === path.node.name[0].toUpperCase() &&
          path.node.name !== 'MDXLayout' &&
          (path.parentPath.isJSXOpeningElement() ||
            path.parentPath.isJSXClosingElement())
        ) {
          path.replaceWith(
            t.jsxMemberExpression(t.jsxIdentifier('components'), path.node)
          )
        }
      },
    },
  }
}
