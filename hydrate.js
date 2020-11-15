// The code here is IE 11 compatible, and only works if Next.js polyfills are included
const React = require('react')
const mdxReact = require('@mdx-js/react')

const mdx = mdxReact.mdx
const MDXProvider = mdxReact.MDXProvider

function MdxRemote(props) {
  const source = props.source + 'return MDXContent;'
  const scope = props.scope || {}
  const args = ['mdx'].concat(Object.keys(scope), source)
  const getContent = Function.apply(null, args)
  const MDXContent = getContent.apply(null, [mdx].concat(Object.values(scope)))

  return React.createElement(
    MDXProvider,
    { components: props.components },
    React.createElement(MDXContent, props)
  )
}

module.exports = React.memo(MdxRemote)
