import { codeFrameColumns } from '@babel/code-frame'

// types

/**
 * Prints a nicely formatted error message from an error caught during MDX compilation.
 *
 * @param error - Error caught from the mdx compiler
 * @param source - Raw MDX string
 * @returns Error
 */
export function createFormattedMDXError(error: any, source: string) {
  const codeFrames = error?.position
    ? codeFrameColumns(source, {
        start: {
          line: error.position.start.line,
          column: error.position.start.column ?? 0,
        },
      })
    : ''

  const formattedError = new Error(`[next-mdx-remote] error compiling MDX:
${error?.message}
${codeFrames ? '\n' + codeFrames + '\n' : ''}
More information: https://v2.mdxjs.com/docs/troubleshooting-mdx`)

  formattedError.stack = error.stack

  return formattedError
}
