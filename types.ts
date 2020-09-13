export interface Scope {}

export interface Source {
  compiledSource: string
  renderedOutput: string
  scope?: Scope
}
