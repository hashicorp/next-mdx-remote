/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { compileMDX } from '../rsc'

import { describe, test, expect } from 'vitest'

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
})
