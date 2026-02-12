# next-mdx-remote

## 6.0.0

### Breaking/Major Changes

- [#448](https://github.com/hashicorp/next-mdx-remote/pull/498)

* Updated unist-util-remove to ^4.0.0
* Introduced the parameters blockJS and blockDangerousJS that controls how JS in interpreted during compiling MDX. Both default to true for security reasons.
* Updated the README to explain this change: https://github.com/hashicorp/next-mdx-remote/pull/498/changes#diff-b335630551682c19a781afebcf4d07bf978fb1f8ac04c6bf87428ed5106870f5R393.

## 5.0.0

### Major Changes

- [#448](https://github.com/hashicorp/next-mdx-remote/pull/448) [`67a221f`](https://github.com/hashicorp/next-mdx-remote/commit/67a221fa59418af1289ea360ba42a2cdc3c2e5c1) Thanks [@dstaley](https://github.com/dstaley)! - Update to MDX v3 and add support for React 19. Fix various TypeScript errors. Remove usage of Rollup.
