import { createElement } from 'react'

export interface Scope {}

export type Components = Parameters<typeof createElement>[1]

export interface Source {
  source: string
  renderedOutput: string
  scope?: Scope
}
