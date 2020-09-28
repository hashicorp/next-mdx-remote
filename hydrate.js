// The code here is IE 11 compatible, and only works if Next.js polyfills are included
const React = require('react')
const mdxReact = require('@mdx-js/react')

const mdx = mdxReact.mdx
const MDXProvider = mdxReact.MDXProvider

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
