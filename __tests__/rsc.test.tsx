/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

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

  test('', async () => {
    const { tocData } = await compileMDX({
      source: `
      # heading 1

      ## heading 2

      ### heading 3
      
      #things do not show up in the TOC
      `,
      options: {
        parseToc: true,
      },
    })

    const expected = [
      {
        depth: 1,
        id: 'heading-1',
        text: 'heading 1',
        children: [
          {
            depth: 2,
            id: 'heading-2',
            text: 'heading 2',
            children: [
              {
                depth: 3,
                id: 'heading-3',
                text: 'heading 3',
                children: [],
              },
            ],
          },
        ],
      },
    ];

    expect(tocData).toEqual(expected);
  })
})
