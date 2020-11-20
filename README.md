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

So, `next-mdx-remote` changes the entire pattern so that you load your MDX content not through an import, but rather through `getStaticProps` or `getServerProps` -- you know, the same way you would load any other data. The library provides the tools to serialize and render the MDX content in a manner that is performant. This removes all of the limitations listed above, and does so at a significantly lower cost -- `next-mdx-enhanced` is a very heavy library with a lot of custom logic and [some annoying limitations](https://github.com/hashicorp/next-mdx-enhanced/issues/17). Early testing has shown build times reduced by 50% or more.

## Installation

```sh
# using npm
npm i next-mdx-remote

# using yarn
yarn add next-mdx-remote
```

## Example Usage

```jsx
import serialize from 'next-mdx-remote/serialize'
import MdxRemote from 'next-mdx-remote/mdx-remote'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source }) {
  return (
    <div className="wrapper">
      <MdxRemote source={source} components={components} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = 'Some **MDX** text, with a component <Test />'
  const mdxSource = await serialize(source)
  return { props: { source: mdxSource } }
}
```

While it may seem strange to see these two in the same file, this is one of the cool things about Next.js -- `getStaticProps` and `TestPage`, while appearing in the same file, run in two different places. Ultimately your browser bundle will not include `getStaticProps` at all, or any of the functions only it uses, so `renderToString` will be removed from the browser bundle entirely.

## APIs

This library exposes one function and one component, `serialize` and `MdxRemote`. These two are purposefully isolated into their own files -- `serialize` is intended to be run **server-side**, so within `getStaticProps`, which runs on the server/at build time. `MdxRemote` on the other hand is a React component that renders the MDX output.

- **`serialize(source: string, { mdxOptions?: object } = {})`**

  **`renderToString`** consumes a string of MDX and returns a JS string. It can optionally be passed options (`mdxOptions`) which are [passed directly to MDX](https://mdxjs.com/advanced/plugins). The returned JS string is a function that returns a React component and is used by `MdxRemote` to render the content.

  ```ts
  import serialize from 'next-mdx-remote/serialize'

  serialize(
    // Raw MDX contents as a string
    '# hello, world',
    // Optional parameters
    {
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

- **`<MdxRemote source={string} components?={object} scope?={object} />`**

  **`MdxRemote`** renders the output of `serialize`. It accepts custom components and scope object that can be included in the MDX scope.

  ```jsx
  import MdxRemote from 'next-mdx-remote/mdx-remote'

  const components = { name: React.ComponentType }

  function Content({ source }) {
    // `source` is the output of `serialize`
    return <MdxRemote source={source} components={components} />
  }
  ```

  Any component that's allows by MDX and custom components like `<Test />` can be passed to `MdxRemote`

## Frontmatter & Custom Processing

Markdown in general is often paired with frontmatter, and normally this means adding some extra custom processing to the way markdown is handled. Luckily, this can be done entirely independently of `next-mdx-remote`, along with any extra custom processing necessary.

Let's walk through an example of how we could process frontmatter out of our MDX source:

```jsx
import serialize from 'next-mdx-remote/serialize'
import MdxRemote from 'next-mdx-remote/mdx-remote'

import matter from 'gray-matter'

import Test from '../components/test'

const components = { Test }

export default function TestPage({ source, frontMatter }) {
  return (
    <div className="wrapper">
      <h1>{frontMatter.title}</h1>
      <MdxRemote source={source} components={components} scope={frontMatter} />
    </div>
  )
}

export async function getStaticProps() {
  // MDX text - can be from a local file, database, anywhere
  const source = `
---
title: Test
---

Some **MDX** text, with a component <Test name={title}/>
  `

  const { content, data } = matter(source)
  const mdxSource = await serialize(content)
  return { props: { source: mdxSource, frontMatter: data } }
}
```

Nice and easy - since we get the content as a string originally and have full control, we can run any extra custom processing needed before passing it into `serialize`, and easily append extra data to the returned props in `getStaticProps` without issue.

## Caveats

There's only one caveat here, which is that imports or exports won't be resolved in MDX files. If you need to use custom components, or have imports or exports in your MDX files, they should be provided through the `components` prop to the `MdxRemote` component.

Hopefully this makes sense, since in order to work, imports and exports must be relative to a file path, and this library allows content to be loaded from anywhere, rather than only loading local content from a set file path.

## Security

This library evaluates a string of JavaScript on the client side, which is how it renders the MDX content. Evaluating a string into javascript can be a dangerous practice if not done carefully, as it can enable XSS attacks. It's important to make sure that you are only passing the source input generated by the `serialize` function to `MdxRemote`, as instructed in the documentation. **Do not pass user input into `MdxRemote`.**

If you have a CSP on your website that disallows code evaluation via `new Function()`, you will need to loosen that restriction in order to utilize the `MdxRemote` function, which can be done using [`unsafe-eval`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#common_sources).

## License

[Mozilla Public License Version 2.0](./LICENSE)
