/**
 * Copyright IBM Corp. 2020, 2024
 * SPDX-License-Identifier: MPL-2.0
 */

import { codeFrameColumns } from '@babel/code-frame'

/**
 * Attempt to parse position information from an error message originating from the MDX compiler.
 * Only used if the error object doesn't contain
 */
function parsePositionInformationFromErrorMessage(
  message: string
): { start: { line: number; column: number } } | undefined {
  const positionInfoPattern = /\d+:\d+(-\d+:\d+)/g

  const match = message.match(positionInfoPattern)

  if (match) {
    // take the last match, that seems to be the most reliable source of the error.
    const lastMatch = match.slice(-1)[0]

    const [line, column] = lastMatch.split('-')[0].split(':')

    return {
      start: {
        line: Number.parseInt(line, 10),
        column: Number.parseInt(column, 10),
      },
    }
  }
}

/**
 * Prints a nicely formatted error message from an error caught during MDX compilation.
 *
 * @param error - Error caught from the mdx compiler
 * @param source - Raw MDX string
 * @returns Error
 */
export function createFormattedMDXError(error: any, source: string) {
  const position =
    error?.position ?? parsePositionInformationFromErrorMessage(error?.message)

  const codeFrames = position
    ? codeFrameColumns(
        source,
        {
          start: {
            line: position.start.line,
            column: position.start.column ?? 0,
          },
        },
        { linesAbove: 2, linesBelow: 2 }
      )
    : ''

  const formattedError = new Error(`[next-mdx-remote] error compiling MDX:
${error?.message}
${codeFrames ? '\n' + codeFrames + '\n' : ''}
More information: https://mdxjs.com/docs/troubleshooting-mdx`)

  formattedError.stack = ''

  return formattedError
}
