export default function BabelPluginMdxBrowser(): {
  visitor: {
    ImportDeclaration(path: any): void
    VariableDeclaration(path: any): void
  }
}
//# sourceMappingURL=babel-plugin-mdx-browser.d.ts.map
