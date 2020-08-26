import renderToString from 'next-mdx-remote/render-to-string'
import hydrate from 'next-mdx-remote/hydrate'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

const root = process.cwd()

export default function BlogPost({ mdxSource, frontMatter }) {
  const content = hydrate(mdxSource)
  return (
    <>
      <h1>{frontMatter.title}</h1>
      {content}
    </>
  )
}

export async function getStaticPaths() {
  return {
    fallback: false,
    paths: fs
      .readdirSync(path.join(root, 'content'))
      .map((p) => ({ params: { slug: p.replace(/\.mdx/, '') } })),
  }
}

export async function getStaticProps({ params }) {
  const source = fs.readFileSync(
    path.join(root, 'content', `${params.slug}.mdx`),
    'utf8'
  )
  const { data, content } = matter(source)
  const mdxSource = await renderToString(content)
  return { props: { mdxSource, frontMatter: data } }
}
