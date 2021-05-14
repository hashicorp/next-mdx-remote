<!-- markdownlint-disable-file MD033 MD041 -->

<!--

# next-mdx-remote

A set of light utilities allowing mdx to be loaded within `getStaticProps` or `getServerSideProps` and hydrated correctly on the client.

-->

[![next-mdx-remote](./header.png)](.)

---

- [Background & Theory](#background--theory)
- [Installation](#installation)
- [Examples](#examples)
- [APIs](#apis)
- [Frontmatter & Custom Processing](#frontmatter--custom-processing)
- [Caveats](#caveats)
- [Security](#security)
- [TypeScript](#typescript)
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

## Examples

```jsx
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} components={components} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = 'Some **mdx** text, with a component <Test />'
  const mdxSource = await serialize(source)
  return { props: { source: mdxSource } }
}
```

While it may seem strange to see these two in the same file, this is one of the cool things about Next.js -- `getStaticProps` and `TestPage`, while appearing in the same file, run in two different places. Ultimately your browser bundle will not include `getStaticProps` at all, or any of the functions it uses only on the server, so `serialize` will be removed from the browser bundle entirely.

### Additional Examples

<details>
  <summary>Passing custom data (component)</summary>

`<MDXRemote />` accepts a `scope` prop, which makes all of the values available for use in your MDX.

```jsx
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import Test from '../components/test'

const components = { Test }
const data = { product: 'next' }

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} components={components} scope={data} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source =
    'Some **mdx** text, with a component <Test /> and some data: {product}'
  const mdxSource = await serialize(source)
  return { props: { source: mdxSource } }
}
```

</details>

<details>
  <summary>Passing custom data (serialize)</summary>

You can also pass custom data into `serialize`, which will then pass the value through and make it available from its result. By spreading the result from `source` into `<MDXRemote />`, the data will be made available.

Note that any scope values passed into `serialize` need to be serializable, meaning passing functions or components is not possible. If you need to pass custom scope that is not just an object, pass `scope` directly to `<MDXRemote />` where it's rendered.

```jsx
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import Test from '../components/test'

const components = { Test }
const data = { product: 'next' }

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} components={components} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source =
    'Some **mdx** text, with a component <Test /> and some data: {product}'
  const mdxSource = await serialize(source, { scope: data })
  return { props: { source: mdxSource } }
}
```

</details>

<details>
  <summary>
    Custom components from <code>MDXProvider</code><a id="mdx-provider"></a>
  </summary>

If you want to make components available to any `<MDXRemote />` being rendered in your application, you can use [`<MDXProvider />`](https://mdxjs.com/advanced/components#mdxprovider) from `@mdx-js/react`.

```jsx
// pages/_app.jsx
import { MDXProvider } from '@mdx-js/react'

const components = { Test }

export default function MyApp({ Component, pageProps }) {
  return (
    <MDXProvider components={components}>
      <Component {...pageProps} />
    </MDXProvider>
  )
}
```

```jsx
// pages/test.jsx
import { MDXProvider } from '@mdx-js/react'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import Test from '../components/test'

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = 'Some **mdx** text, with a component <Test />'
  const mdxSource = await serialize(source)
  return { props: { source: mdxSource } }
}
```

</details>

<details>
  <summary>
    Component names with dot (e.g. <code>motion.div</code>)
  </summary>

Component names that contain a dot (`.`), such as those from `framer-motion`, can be rendered as long as the top-level namespace is declared in the MDX scope:

```js
import { motion } from 'framer-motion'

import { MDXProvider } from '@mdx-js/react'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} scope={{ motion }} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = `Some **mdx** text, with a component:

<motion.div animate={{ x: 100 }} />`
  const mdxSource = await serialize(source)
  return { props: { source: mdxSource } }
}
```

</details>

<details>
  <summary>Lazy hydration</summary>

Lazy hydration defers hydration of the components on the client. This is an optimization technique to improve the initial load of your application, but may introduce unexpected delays in interactivity for any dynamic content within your MDX content.

_Note: this will add an additional wrapping `div` around your rendered MDX, which is necessary to avoid [hydration mismatches during render](https://reactjs.org/docs/react-dom.html#hydrate)._

```jsx
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MDXRemote {...source} components={components} lazy />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = 'Some **mdx** text, with a component <Test />'
  const mdxSource = await serialize(source)
  return { props: { source: mdxSource } }
}
```

</details>

## APIs

This library exposes a function and a component, `serialize` and `<MDXRemote />`. These two are purposefully isolated into their own files -- `serialize` is intended to be run **server-side**, so within `getStaticProps`, which runs on the server/at build time. `<MDXRemote />` on the other hand is intended to be run on the client side, in the browser.

- **`serialize(source: string, { mdxOptions?: object, scope?: object, target?: string | string[] })`**

  **`serialize`** consumes a string of MDX. It also can optionally be passed options which are [passed directly to MDX](https://mdxjs.com/advanced/plugins), and a scope object that can be included in the mdx scope. The function returns an object that is intended to be passed into `<MDXRemote />` directly.

  ```ts
  serialize(
    // Raw MDX contents as a string
    '# hello, world',
    // Optional parameters
    {
      // made available to the arguments of any custom mdx component
      scope: {},
      // MDX's available options at time of writing pulled directly from
      // https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js
      mdxOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
        hastPlugins: [],
        compilers: [],
        filepath: '/some/file/path',
      },
      // Specify the target environment for the generated code. See esbuild docs:
      // https://esbuild.github.io/api/#target
      target: ['esnext'],
    }
  )
  ```

  Visit <https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js> for available `mdxOptions`.

- **`<MDXRemote compiledSource={string} components?={object} scope?={object} lazy?={boolean} />`**

  **`<MDXRemote />`** consumes the output of `serialize` as well as an optional components argument. Its result can be rendered directly into your component. To defer hydration of the content and immediately serve the static markup, pass the `lazy` prop.

  ```ts
  <MDXRemote {...source} components={components} />
  ```

## Frontmatter & Custom Processing

Markdown in general is often paired with frontmatter, and normally this means adding some extra custom processing to the way markdown is handled. Luckily, this can be done entirely independently of `next-mdx-remote`, along with any extra custom processing necessary.

Let's walk through an example of how we could process frontmatter out of our MDX source:

```jsx
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import matter from 'gray-matter'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source, frontMatter }) {
  return (
    <div className="wrapper">
      <h1>{frontMatter.title}</h1>
      <MDXRemote {...source} components={components} />
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
  const mdxSource = await serialize(content, { scope: data })
  return { props: { source: mdxSource, frontMatter: data } }
}
```

Nice and easy - since we get the content as a string originally and have full control, we can run any extra custom processing needed before passing it into `serialize`, and easily append extra data to the return value from `getStaticProps` without issue.

### Replacing default components

Rendering will use [`MDXProvider`](https://mdxjs.com/getting-started#mdxprovider) under the hood. This means you can replace HTML tags by custom components. Those components are listed in MDXJS [Table of components](https://mdxjs.com/table-of-components).

An example use case is rendering the content with your preferred styling library.

```jsx
import { Typography } from "@material-ui/core";

const components = { Test, h2: (props) => <Typography variant="h2" {...props} /> }
...
```

If you prefer, you can also wrap your entire application in an `<MDXProvider />` instead of passing your components directly to `<MDXRemote />`. See the [example](#mdx-provider) above.

Note: `th/td` won't work because of the "/" in the component name.

### How Can I Build A Blog With This?

Data has shown that 99% of use cases for all developer tooling are building unnecessarily complex personal blogs. Just kidding. But seriously, if you are trying to build a blog for personal or small business use, consider just using normal html and css. You definitely do not need to be using a heavy full-stack javascript framework to make a simple blog. You'll thank yourself later when you return to make an update in a couple years and there haven't been 10 breaking releases to all of your dependencies.

If you really insist though, check out [our official nextjs example implementation](https://github.com/vercel/next.js/tree/canary/examples/with-mdx-remote). 💖

### Caveats

#### Environment Targets

The code generated by `next-mdx-remote`, which is used to actually render the MDX, is transformed to support: `>= node 12, es2020`.

#### `import` / `export`

`import` and `export` statements cannot be used **inside** an MDX file. If you need to use components in your MDX files, they should be provided as a prop to `<MDXRemote />`.

Hopefully this makes sense, since in order to work, imports must be relative to a file path, and this library allows content to be loaded from anywhere, rather than only loading local content from a set file path. As for exports, the MDX content is treated as data, not a **module**, so there is no way for us to access any value which may be exported from the MDX passed to `next-mdx-remote`.

## Security

This library evaluates a string of JavaScript on the client side, which is how it MDXRemotes the MDX content. Evaluating a string into javascript can be a dangerous practice if not done carefully, as it can enable XSS attacks. It's important to make sure that you are only passing the `mdxSource` input generated by the `serialize` function to `<MDXRemote />`, as instructed in the documentation. **Do not pass user input into `<MDXRemote />`.**

If you have a CSP on your website that disallows code evaluation via `eval` or `new Function()`, you will need to loosen that restriction in order to utilize `next-mdx-remote`, which can be done using [`unsafe-eval`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#common_sources).

## TypeScript

This project does include native types for TypeScript use. Both `serialize` and `<MDXRemote />` have types normally as you'd expect, and the library also exports a type which you can use to type the result of `getStaticProps`.

- `MDXRemoteSerializeResult<TScope = Record<string, unknown>>`: Represents the return value of `serialize`. The `TScope` generic type can be passed to represent the type of the scoped data you pass in.

Below is an example of a simple implementation in TypeScript. You may not need to implement the types exactly in this way for every configuration of TypeScript - this example is just a demonstration of where the types could be applied if needed.

```tsx
import { GetStaticProps } from 'next'
import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import ExampleComponent from './example'

const components = { ExampleComponent }

interface Props {
  mdxSource: MDXRemoteSerializeResult
}

export default function ExamplePage({ mdxSource }: Props) {
  return (
    <div>
      <MDXRemote {...mdxSource} components={components} />
    </div>
  )
}

export const getStaticProps: GetStaticProps<MDXRemoteSerializeResult> = async () => {
  const mdxSource = await serialize('some *mdx* content: <ExampleComponent />')
  return { props: { mdxSource } }
}
```

## License

[Mozilla Public License Version 2.0](./LICENSE)
