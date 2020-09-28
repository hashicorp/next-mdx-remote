const React = require('react')
const { mdx, MDXProvider } = require('@mdx-js/react')

// The code here is IE 11 compatible
module.exports = function hydrate(source, props, options) {
  const scope = (options && options.scope) || {}
  const getContent = new Function(
    'mdx',
    ...Object.keys(scope),
    `${source}
return MDXContent;`
  )
  const MDXContent = getContent(mdx, ...Object.values(scope))

  return React.createElement(
    MDXProvider,
    { components: props && props.components },
    React.createElement(MDXContent, props)
  )
}
