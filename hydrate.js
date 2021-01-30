// *** NOTE: Do not use any ES6 features because of IE11 compatibility! ***

require('./idle-callback-polyfill')
var React = require('react')
var MDX = require('@mdx-js/react')

module.exports = function hydrate(params, options) {
  var compiledSource = params.compiledSource
  var renderedOutput = params.renderedOutput
  var scope = params.scope || {}
  var components = (options && options.components) || {}
  var provider = options && options.provider

  // our default result is the server-rendered output
  // we get this in front of users as quickly as possible
  var useStateResult = React.useState(
    React.createElement('div', {
      dangerouslySetInnerHTML: {
        __html: renderedOutput,
      },
    })
  )
  var result = useStateResult[0]
  var setResult = useStateResult[1]

  // to track if hydration is completed
  var hydrationStatus = React.useState(false)
  var isHydrated = hydrationStatus[0]
  var setIsHydrated = hydrationStatus[1]

  // if we're server-side, we can return the raw output early
  if (typeof window === 'undefined') return result

  // if we're on the client side, we hydrate the mdx content inside
  // requestIdleCallback, since we can be fairly confident that
  // markdown - embedded components are not a high priority to get
  // to interactive compared to...anything else on the page.
  //
  // once the hydration is complete, we update the state/memo value and
  // react re-renders for us
  React.useEffect(
    function () {
      setIsHydrated(false)
      var handle = window.requestIdleCallback(function () {
        // first we set up the scope which has to include the mdx custom
        // create element function as well as any components we're using
        var fullScope = Object.assign({ mdx: MDX.mdx }, components, scope)
        var keys = Object.keys(fullScope)
        var values = Object.values(fullScope)

        // now we eval the source code using a function constructor
        // in order for this to work we need to have React, the mdx createElement,
        // and all our components in scope for the function, which is the case here
        // we pass the names (via keys) in as the function's args, and execute the
        // function with the actual values.
        var hydrateFn = Reflect.construct(
          Function,
          ['React']
            .concat(keys)
            .concat(
              compiledSource + '\nreturn React.createElement(MDXContent, {});'
            )
        )

        var hydrated = hydrateFn.apply(hydrateFn, [React].concat(values))

        // wrapping the content with MDXProvider will allow us to customize the standard
        // markdown components (such as "h1" or "a") with the "components" object
        var wrappedWithMdxProvider = React.createElement(
          MDX.MDXProvider,
          { components: components },
          hydrated
        )

        var result = wrappedWithMdxProvider

        // finally, set the the output as the new result so that react will re-render for us
        // and cancel the idle callback since we don't need it anymore
        setResult(result)
        setIsHydrated(true)
        window.cancelIdleCallback(handle)
      })
    },
    [compiledSource]
  )

  if (provider) {
    return {
      isHydrated,
      content: React.createElement(
        provider.component,
        provider.props || {},
        result
      ),
    }
  }

  return {
    isHydrated,
    content: result,
  }
}
