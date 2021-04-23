<!-- markdownlint-disable-file MD033 MD041 -->

<!--

# next-mdx-remote

A set of light utilities allowing mdx to be loaded within `getStaticProps` or `getServerSideProps` and hydrated correctly on the client.

-->

[![next-mdx-remote](./header.png)](.)

---

- [Background & Theory](#background--theory)
- [Installation](#installation)
- [Example Usage](#example-usage)
- [APIs](#apis)
- [Frontmatter & Custom Processing](#frontmatter--custom-processing)
- [Caveats](#caveats)
- [Security](#security)
- [License](#license)

---

## Background & Theory

If you are using MDX within a Next.js app, you are probably using the Webpack loader. This means that you have your MDX files locally and are probably using [`next-mdx-enhanced`](https://github.com/hashicorp/next-mdx-enhanced) in order to be able to render your MDX files into layouts and import their front matter to create index pages.

This workflow is fine, but introduces a few limitations that we aim to remove with `next-mdx-remote`:

- **The file content must be local.** You cannot store MDX files in another repo, a database, etc. For a large enough operation, there will end up being a split between those authoring content and those working on presentation of the content. Overlapping these two concerns in the same repo makes a more difficult workflow for everyone.
- **You are bound to filesystem-based routing.** Your pages are generated with urls according to their locations. Or maybe you remap them using `exportPathMap`, which creates confusion for authors. Regardless, moving pages around in any way breaks things -- either the page's url or your `exportPathMap` configuration.
- **You will end up running into performance issues.** Webpack is a JavaScript bundler, forcing it to load hundreds/thousands of pages of text content will blow out your memory requirements. Webpack stores each page as a distinct object with a large amount of metadata. One of our implementations with a couple hundred pages hit more than 8GB of memory required to compile the site. Builds took more than 25 minutes.
- **You will be limited in the ways you are able to structure relational data.** Organizing content into dynamic, related categories is difficult when your entire data structure is front matter parsed into javascript objects and held in memory.

So, `next-mdx-remote` changes the entire pattern so that you load your MDX content not through an import, but rather through `getStaticProps` or `getServerProps` -- you know, the same way you would load any other data. The library provides the tools to serialize and hydrate the MDX content in a manner that is performant. This removes all of the limitations listed above, and does so at a significantly lower cost -- `next-mdx-enhanced` is a very heavy library with a lot of custom logic and [some annoying limitations](https://github.com/hashicorp/next-mdx-enhanced/issues/17). Early testing has shown build times reduced by 50% or more.

## Installation

```sh
# using npm
npm i next-mdx-remote

# using yarn
yarn add next-mdx-remote
```

## Example Usage

```jsx
import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source }) {
  const content = hydrate(source, { components })
  return <div className="wrapper">{content}</div>
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = 'Some **mdx** text, with a component <Test />'
  const mdxSource = await renderToString(source, { components })
  return { props: { source: mdxSource } }
}
```

While it may seem strange to see these two in the same file, this is one of the cool things about next.js -- `getStaticProps` and `TestPage`, while appearing in the same file, run in two different places. Ultimately your browser bundle will not include `getStaticProps` at all, or any of the functions it uses only on the server, so `renderToString` will be removed from the browser bundle entirely.

## APIs

This library exposes two functions, `renderToString` and `hydrate`, much like `react-dom`. These two are purposefully isolated into their own files -- `renderToString` is intended to be run **server-side**, so within `getStaticProps`, which runs on the server/at build time. `hydrate` on the other hand is intended to be run on the client side, in the browser.

- **`renderToString(source: string, { components?: object, mdxOptions?: object, provider?: object, scope?: object })`**

  **`renderToString`** consumes a string of MDX along with any components it utilizes in the format `{ ComponentName: ActualComponent }`. It also can optionally be passed options which are [passed directly to MDX](https://mdxjs.com/advanced/plugins), and a scope object that can be included in the mdx scope. The function returns an object that is intended to be passed into `hydrate` directly.

  ```ts
  renderToString(
    // Raw MDX contents as a string
    '# hello, world',
    // Optional parameters
    {
      // The `name` is how you will invoke the component in your MDX
      components?: { name: React.Component },
      // wraps the given provider around the mdx content
      provider?: { component: React.Component, props: Record<string, unknown> },
      // made available to the arguments of any custom mdx component
      scope?: {},
      // MDX's available options at time of writing pulled directly from
      // https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js
      mdxOptions?: {
        remarkPlugins: [],
        rehypePlugins: [],
        hastPlugins: [],
        compilers: [],
        filepath: '/some/file/path',
      },
    }
  )
  ```

  Visit <https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js> for available `mdxOptions`.

- **`hydrate(source: object, { components?: object, provider?: object, synchronous?: boolean })`**

  **`hydrate`** consumes the output of `renderToString` as well as the same components argument as `renderToString`. Its result can be rendered directly into your component. This function will initially render static content, and hydrate it when the browser isn't busy with higher priority tasks. If the option `synchronous: true` is given, it will instead render content synchronously (skipping the static content altogether), which gives a slower initial render but avoids the default behavior of replacing the contents of the DOM after the asynchronous hydration is complete.

  ```ts
  hydrate(
    // The direct return value of `renderToString`
    source,
    // Should be the exact same components that were passed to `renderToString`
    {
      components: { name: React.ComponentType },
      provider: { component: React.ComponentType, props: Record<string, unknown> },
      synchronous: boolean,
    }
  )
  ```

## Frontmatter & Custom Processing

Markdown in general is often paired with frontmatter, and normally this means adding some extra custom processing to the way markdown is handled. Luckily, this can be done entirely independently of `next-mdx-remote`, along with any extra custom processing necessary.

Let's walk through an example of how we could process frontmatter out of our MDX source:

```jsx
import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'

import matter from 'gray-matter'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source, frontMatter }) {
  const content = hydrate(source, { components })
  return (
    <div className="wrapper">
      <h1>{frontMatter.title}</h1>
      {content}
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = `---
title: Test
---

Some **mdx** text, with a component <Test name={title}/>
  `

  const { content, data } = matter(source)
  const mdxSource = await renderToString(content, { components, scope: data })
  return { props: { source: mdxSource, frontMatter: data } }
}
```

Nice and easy - since we get the content as a string originally and have full control, we can run any extra custom processing needed before passing it into `renderToString`, and easily append extra data to the return value from `getStaticProps` without issue.

### Using Providers

If any of the components in your MDX file require access to the values from a provider, you need special handling for this. Remember, this library treats your mdx content as _data provided to your page_, not as a page itself, so providers in your normal scope will not naturally wrap its results.

Let's look at an example of using an auth0 provider, so that you could potentially customize some of your mdx components to the user viewing them.

```jsx
import { Auth0Provider } from '@auth0/auth0-react'
import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'
import Test from '../components/test'

const components = { Test }

// here, we build a provider config object
const provider = {
  component: Auth0Provider,
  props: { domain: 'example.com', clientId: 'xxx', redirectUri: 'xxx' },
}

export default function TestPage({ source }) {
  const content = hydrate(source, { components, provider }) // <- add the provider here
  return <div className="wrapper">{content}</div>
}

export async function getStaticProps() {
  // mdx text - can be from a local file, database, anywhere
  const source = 'Some **mdx** text, with a component <Test />'
  const mdxSource = await renderToString(source, { components, provider }) // <- add it here as well
  return { props: { source: mdxSource } }
}
```

That's it! The provider will be wrapped around your MDX page when hydrated and you will be able to access any of its values from within your components. For an example using a custom provider, check out the test suite.

### Replacing default components

Rendering will use [`MDXProvider`](https://mdxjs.com/getting-started#mdxprovider) under the hood. This means you can replace HTML tags by custom components. Those components are listed in MDXJS [Table of components](https://mdxjs.com/table-of-components). 

An example use case is rendering the content with your preferred styling library.

```jsx
import { Typography } from "@material-ui/core";

const components = { Test, h2: (props) => <Typography variant="h2" {...props} /> }
...
```

Note: "th/td" won't work because of the "/" in the component name.


### How Can I Build A Blog With This?

Data has shown that 99% of use cases for all developer tooling are building unnecessarily complex personal blogs. Just kidding. But seriously, if you are trying to build a blog for personal or small business use, consider just using normal html and css. You definitely do not need to be using a heavy full-stack javascript framework to make a simple blog. You'll thank yourself later when you return to make an update in a couple years and there haven't been 10 breaking releases to all of your dependencies.

If you really insist though, check out [our official nextjs example implementation](https://github.com/vercel/next.js/tree/canary/examples/with-mdx-remote). 💖

### Caveats

There's only one caveat here, which is that `import` cannot be used **inside** an MDX file. If you need to use components in your MDX files, they should be provided through the second argument to the `hydrate` and `renderToString` functions.

Hopefully this makes sense, since in order to work, imports must be relative to a file path, and this library allows content to be loaded from anywhere, rather than only loading local content from a set file path.

## Security

This library evaluates a string of JavaScript on the client side, which is how it hydrates the MDX content. Evaluating a string into javascript can be a dangerous practice if not done carefully, as it can enable XSS attacks. It's important to make sure that you are only passing the `mdxSource` input generated by the `render-to-string` function to `hydrate`, as instructed in the documentation. **Do not pass user input into `hydrate`.**

If you have a CSP on your website that disallows code evaluation via `eval` or `new Function()`, you will need to loosen that restriction in order to utilize the `hydrate` function, which can be done using [`unsafe-eval`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#common_sources).

### Usage Without Hydration

It's also worth noting that you do not _have_ to use `hydrate` on the client side — but without it, you will get a server-rendered result, meaning no ability to react to user input, etc. To do this, pass the `renderedOutput` prop of the object returned by `renderToString` to [`dangerouslySetInnerHTML`](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml):

```jsx
import renderToString from 'next-mdx-remote/render-to-string'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ renderedOutput }) {
  return (
    <div
      className="wrapper"
      dangerouslySetInnerHTML={{ __html: renderedOutput }}
    />
  )
}

export async function getStaticProps() {
  // <Test /> will be rendered to static markup, but will be non-interactive!
  const source = 'Some **mdx** text, with a component <Test />'
  const { renderedOutput } = await renderToString(source, { components })
  return { props: { renderedOutput } }
}
```

## Typescript

This project does include native types for typescript use. Both `renderToString` and `hydrate` have types normally as you'd expect, and the library also offers exports of two types that are shared between the two functions and that you may need to include in your own files. Both types can be imported from `next-mdx-remote/types` and are namespaced under `MdxRemote`. The two types are as follows:

- `MdxRemote.Components` - represents the type of the "components" object referenced in the docs above, which needs to be passed to both `hydrate` and `renderToString`
- `MdxRemote.Source` - represents the type of the return value of `renderToString`, which also must be passed into `hydrate.

Below is an example of a simple implementation in typescript. You may not need to implement the types exactly in this way for every configuration of typescript - this example is just a demonstration of where the types could be applied if needed.

```ts
import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'
import { MdxRemote } from 'next-mdx-remote/types'
import ExampleComponent from './example'

const components: MdxRemote.Components = { ExampleComponent }

interface Props {
  mdxSource: MdxRemote.Source
}

export default function ExamplePage({ mdxSource }: Props) {
  const content = hydrate(mdxSource, { components })
  return <div>{content}</div>
}

export async function getStaticProps() {
  const mdxSource = await renderToString(
    'some *mdx* content: <ExampleComponent />',
    { components }
  )
  return { props: { mdxSource } }
}
```

## License

[Mozilla Public License Version 2.0](./LICENSE)
