import { compile } from 'xdm'

describe('xdm with custom components', () => {
  test.only('xdm custom component', async () => {
    const result = await compile(`foo
    <Test name="test" />`)

    expect(result).toEqual('')
  })
})
