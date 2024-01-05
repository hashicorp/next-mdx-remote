/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { describe, expect, test } from 'vitest'
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
})
