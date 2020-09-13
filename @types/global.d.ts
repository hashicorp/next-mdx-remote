declare global {
  interface IdleCallback {
    (options: { didTimeout: boolean; timeRemaining: () => number }): void
  }

  interface Window {
    requestIdleCallback: (cb: IdleCallback) => NodeJS.Timeout
    cancelIdleCallback: (id: NodeJS.Timeout) => void
  }
}

export {}
