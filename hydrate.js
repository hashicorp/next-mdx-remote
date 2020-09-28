const React = require('react')
const { mdx, MDXProvider } = require('@mdx-js/react')

// The code here is IE 11 compatible, and only works if Next.js polyfills are included
module.exports = function hydrate(source, props, options) {
  const scope = (options && options.scope) || {}
  const args = ['mdx'].concat(Object.keys(scope), source + 'return MDXContent;')
  const getContent = Function.apply(null, args)
  const MDXContent = getContent.apply(null, [mdx].concat(Object.values(scope)))

  return React.createElement(
    MDXProvider,
    { components: props && props.components },
    React.createElement(MDXContent, props)
  )
}
