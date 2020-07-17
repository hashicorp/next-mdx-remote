# Next MDX Remote

A set of light utilities allowing mdx to be loaded within `getStaticProps` or `getServerSideProps` and hydrated correctly on the client.

### Background & Theory

If you are using mdx within a nextjs app, you are probably using the webpack loader. This means that you have your mdx files locally and are probably using [next-mdx-enhanced](https://github.com/hashicorp/next-mdx-enhanced) in order to be able to render your mdx files into layouts and import their front matter to create index pages. This workflow is fine, but introduces a few limitations that we aim to remove with `next-mdx-remote`:

- The file content must be local. You cannot store mdx files in another repo, a database, etc. For a large enough operation, there will end up being a split between those authoring content and those working on presentation of the content. Overlapping these two concerns in the same repo makes a more difficult workflow for everyone.
- You are bound to filesystem-based routing. Your pages are generated with urls according to their locations. Or maybe you remap them using `exportPathMap`, which creates confusion for authors. Regardless, moving pages around in any way breaks things -- either the page's url or your `exportPathMap` configuration.
- You will end up running into performance issues. Webpack is a javascript bundler, forcing it to load hundreds/thousands of pages of text content will blow out your memory requirements - webpack stores each page as a distinct object with a large amount of metadata. One of our implementations with a couple hundred pages hit more than 8gb of memory required to compile the site. Builds took more than 25 minutes.
- You will be limited in the ways you are able to structure relational data. Organizing content into dynamic, related categories is difficult when your entire data structure is front matter parsed into javascript objects and held in memory.

So, `next-mdx-remote` changes the entire pattern so that you load your mdx content not through an import, but rather through `getStaticProps` or `getServerProps` -- you know, the same way you would load any other data. The library provides the tools to serialize and hydrate the mdx content in a manner that is performant. This removes all of the limitations listed above, and does so at a significantly lower cost -- `next-mdx-enhanced` is a very heavy library with a lot of custom logic and [some annoying limitations](https://github.com/hashicorp/next-mdx-enhanced/issues/17). Early testing has shown build times reduced by 50% or more.

### Installation

```
npm i next-mdx-remote
```

### Usage

This library exposes two functions, `renderToString` and `hydrate`, much like `react-dom`. These two are purposefully isolated into their own files -- `renderToString` is intended to be run **server-side**, so within `getStaticProps`, which runs on the server/at build time. `hydrate` on the other hand is intended to be run on the client side, in the browser.

```jsx
import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'
import Test from '../components/test'

const components = { Test }

export default function TestPage({ mdxSource }) {
  const content = hydrate(mdxSource, components)
  return <div className="wrapper">{content}</div>
}

export async function getStaticProps() {
  // mdx text - can be from a local file, database, anywhere
  const source = 'Some **mdx** text, with a component <Test />'
  const mdxSource = await renderToString(source, components)
  return { props: { mdxSource } }
}
```

While it may seem strange to see these two in the same file, this is one of the cool things about next.js -- `getStaticProps` and `TestPage`, while appearing in the same file, run in two different places. Ultimately your browser bundle will not include `getStaticProps` at all, or any of the functions only it uses, so `renderToString` will be removed from the browser bundle entirely.

Let's break down each function:

- `renderToString(source: string, components: object, options?: object, scope?: object)` - This function consumes a string of mdx along with any components it utilizes in the format `{ ComponentName: ActualComponent }`. It also can optionally be passed options which are [passed directly to mdx](https://mdxjs.com/advanced/plugins), and a scope object that can be included in the mdx scope. The function returns an object that is intended to be passed into `hydrate` directly.
- `hydrate(source: object, components: object)` - This function consumes the output of `renderToString` as well as the same components argument as `renderToString`. Its result can be rendered directly into your component. This function will initially render static content, and hydrate it when the browser isn't busy with higher priority tasks.

### Frontmatter & Custom Processing

Markdown in general is often paired with frontmatter, and normally this means adding some extra custom processing to the way markdown is handled. Luckily, this can be done entirely independently of `next-mdx-remote`, along with any extra custom processing necessary. Let's walk through an example of how we could process frontmatter out of our mdx source.

```jsx
import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'
import Test from '../components/test'
import matter from 'gray-matter'

const components = { Test }

export default function TestPage({ mdxSource, frontMatter }) {
  const content = hydrate(mdxSource, components)
  return (
    <div className="wrapper">
      <h1>{frontMatter.title}</h1>
      {content}
    </div>
  )
}

export async function getStaticProps() {
  // mdx text - can be from a local file, database, anywhere
  const source = `---
title: Test
---

Some **mdx** text, with a component <Test name={title}/>
`
  const { content, data } = matter(source)
  const mdxSource = await renderToString(content, components, null, data)
  return { props: { mdxSource, frontMatter: data } }
}
```

Nice and easy - since we get the content as a string originally and have full control, we can run any extra custom processing needed before passing it into `renderToString`, and easily append extra data to the return value from `getStaticProps` without issue.

### Caveats

There's only one caveat here, which is that `import` cannot be used **inside** an mdx file. If you need to use components in your mdx files, they should be provided through the second argument to the `hydrate` and `renderToString` functions.

Hopefully this makes sense, since in order to work, imports must be relative to a file path, and this library allows content to be loaded from anywhere, rather than only loading local content from a set file path.
