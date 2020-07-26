import { createElement } from 'react'

export interface Scope {}

// export interface Components {
//   [key: string]: React.Component<any>
// }

export type Components = Parameters<typeof createElement>[1]
