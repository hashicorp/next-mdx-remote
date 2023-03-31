import React from 'react'
import { compileMDX } from '../rsc'

describe('compileMDX', () => {
  test('frontmatter types', async () => {
    const { frontmatter } = await compileMDX<{ title: string }>({
      source: `---
title: 'Hello World'
---

# Hi`,
      options: {
        parseFrontmatter: true,
      },
    })

    expect(frontmatter.title).toEqual('Hello World')

    // @ts-expect-error -- blah does not exist on the frontmatter type
    expect(frontmatter.blah).toBeUndefined()
  })

  test('types should accept async components', async () => {
    await compileMDX({
      source: `---
title: 'Hello World'
---

# Hi`,
      components: {
        h1: async (props) => <h1 {...props} />,
      },
    })
  })
})
