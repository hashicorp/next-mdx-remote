/**
 * Copyright IBM Corp. 2020, 2024
 * SPDX-License-Identifier: MPL-2.0
 */

'use client'

import { useState } from 'react'

export default function Test({ name }) {
  const [count, setCount] = useState(0)
  return (
    <>
      <p>hello {name}</p>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </>
  )
}
