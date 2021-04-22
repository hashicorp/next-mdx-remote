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

While it may seem strange to see these two in the same file, this is one of the cool things about next.js -- `getStaticProps` and `TestPage`, while appearing in the same file, run in two different places. Ultimately your browser bundle will not include `getStaticProps` at all, or any of the functions it uses only on the server, so `serialize` will be removed from the browser bundle entirely.

## APIs

This library exposes a function and a component, `serialize` and `<MDXRemote />`. These two are purposefully isolated into their own files -- `serialize` is intended to be run **server-side**, so within `getStaticProps`, which runs on the server/at build time. `<MDXRemote />` on the other hand is intended to be run on the client side, in the browser.

- **`serialize(source: string, { mdxOptions?: object, scope?: object })`**

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
    }
  )
  ```

  Visit <https://github.com/mdx-js/mdx/blob/master/packages/mdx/index.js> for available `mdxOptions`.

- **`<MDXRemote source={object} components?={object} scope?={object} lazy?={boolean} />`**

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

Note: "th/td" won't work because of the "/" in the component name.

### How Can I Build A Blog With This?

Data has shown that 99% of use cases for all developer tooling are building unnecessarily complex personal blogs. Just kidding. But seriously, if you are trying to build a blog for personal or small business use, consider just using normal html and css. You definitely do not need to be using a heavy full-stack javascript framework to make a simple blog. You'll thank yourself later when you return to make an update in a couple years and there haven't been 10 breaking releases to all of your dependencies.

If you really insist though, check out [our official nextjs example implementation](https://github.com/vercel/next.js/tree/canary/examples/with-mdx-remote). 💖

### Caveats

There's only one caveat here, which is that `import` cannot be used **inside** an MDX file. If you need to use components in your MDX files, they should be provided as a prop to `<MDXRemote />`.

Hopefully this makes sense, since in order to work, imports must be relative to a file path, and this library allows content to be loaded from anywhere, rather than only loading local content from a set file path.

## Security

This library evaluates a string of JavaScript on the client side, which is how it MDXRemotes the MDX content. Evaluating a string into javascript can be a dangerous practice if not done carefully, as it can enable XSS attacks. It's important to make sure that you are only passing the `mdxSource` input generated by the `serialize` function to `<MDXRemote />`, as instructed in the documentation. **Do not pass user input into `<MDXRemote />`.**

If you have a CSP on your website that disallows code evaluation via `eval` or `new Function()`, you will need to loosen that restriction in order to utilize `next-mdx-remote`, which can be done using [`unsafe-eval`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#common_sources).

### Usage Without Hydration

It's also worth noting that you do not _have_ to use `<MDXRemote />` on the client side — but without it, you will get a server-rendered result, meaning no ability to react to user input, etc. To do this, pass the `renderedOutput` prop of the object returned by `serialize` to [`dangerouslySetInnerHTML`](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml):

```jsx
import serialize from 'next-mdx-remote/serialize'

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
  const { renderedOutput } = await serialize(source, { components })
  return { props: { renderedOutput } }
}
```

## Typescript

This project does include native types for typescript use. Both `serialize` and `<MDXRemote />` have types normally as you'd expect, and the library also offers exports of two types that are shared between the two functions and that you may need to include in your own files. Both types can be imported from `next-mdx-remote/types` and are namespaced under `MdxRemote`. The two types are as follows:

- `MdxRemote.Components` - represents the type of the "components" object referenced in the docs above, which needs to be passed to `<MDXRemote />` as a prop
- `MdxRemote.Source` - represents the type of the return value of `serialize`, which also must be passed into `<MDXRemote />`

Below is an example of a simple implementation in typescript. You may not need to implement the types exactly in this way for every configuration of typescript - this example is just a demonstration of where the types could be applied if needed.

```ts
import serialize from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote/mdx-remote'
import { MdxRemote } from 'next-mdx-remote/types'
import ExampleComponent from './example'

const components: MdxRemote.Components = { ExampleComponent }

interface Props {
  mdxSource: MdxRemote.Source
}

export default function ExamplePage({ mdxSource }: Props) {
  return (
    <div>
      <MDXRemote {...mdxSource} components={components} />
    </div>
  )
}

export async function getStaticProps() {
  const mdxSource = await serialize('some *mdx* content: <ExampleComponent />')
  return { props: { mdxSource } }
}
```

## License

[Mozilla Public License Version 2.0](./LICENSE)
