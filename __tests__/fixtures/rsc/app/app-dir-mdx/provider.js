'use client'
import { createContext, useEffect, useState } from 'react'

const TestContext = createContext('test')
const PROVIDER = {
  component: TestContext.Provider,
  props: { value: 'foo' },
}

export default function Provider({ children }) {
  const [providerOptions, setProviderOptions] = useState(PROVIDER)

  useEffect(() => {
    setProviderOptions({
      ...PROVIDER,
      props: {
        value: 'bar',
      },
    })
  }, [])

  return (
    <TestContext.Provider {...providerOptions.props}>
      {children}
    </TestContext.Provider>
  )
}

export function Consumer() {
  return (
    <TestContext.Consumer>
      {(value) => <p className="context">Context value: "{value}"</p>}
    </TestContext.Consumer>
  )
}
