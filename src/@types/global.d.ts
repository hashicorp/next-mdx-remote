export {}

declare global {
  interface Window {
    requestIdleCallback: RequestIdleCallbackFunc
    cancelIdleCallback: (timeout: NodeJS.Timeout) => void
  }

  interface RequestIdleCallbackFunc {
    (callback: RequestIdleCallback): NodeJS.Timeout
  }

  interface RequestIdleCallback {
    (args: RequestIdleCallbackArg): void
  }

  interface RequestIdleCallbackArg {
    didTimeout: boolean
    timeRemaining: () => void
  }
}
