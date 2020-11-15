import serialize from 'next-mdx-remote/serialize'
import MdxRemote from 'next-mdx-remote/mdx-remote'
import matter from 'gray-matter'
import fs from 'fs'
import path from 'path'

const root = process.cwd()

const BlogPost = ({ mdxSource, frontMatter }) => (
  <>
    <h1>{frontMatter.title}</h1>
    <MdxRemote source={mdxSource} />
  </>
)

export default BlogPost

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
  const mdxSource = await serialize(content)
  return { props: { mdxSource, frontMatter: data } }
}
