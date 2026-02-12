/**
 * Copyright IBM Corp. 2020, 2024
 * SPDX-License-Identifier: MPL-2.0
 */

import fs from 'fs'
import path from 'path'
import dynamic from 'next/dynamic'
import Test from '../../../components/test'
import { MDXRemote } from 'next-mdx-remote/rsc'

const MDX_COMPONENTS = {
  Test,
  strong: (props) => <strong className="custom-strong" {...props} />,
  Dynamic: dynamic(() => import('../../../components/dynamic')),
}

export default async function Page() {
  const fixturePath = path.join(process.cwd(), 'mdx/test.mdx')
  const source = await fs.promises.readFile(fixturePath, 'utf8')

  return (
    <>
      <MDXRemote
        source={source}
        components={MDX_COMPONENTS}
        options={{
          mdxOptions: { remarkPlugins: [] },
          parseFrontmatter: true,
          blockJS: false,
        }}
      />
    </>
  )
}
