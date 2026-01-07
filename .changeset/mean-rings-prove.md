---
'next-mdx-remote': major
---

Disabled the useDynamicImport option in next-mdx-remote to mitigate a potential remote code execution (RCE) vulnerability. Dynamic imports in MDX content could allow attackers to execute arbitrary code on the server when rendering React Server Components (RSC). This change enforces safer defaults by removing support for dynamic imports, reducing the attack surface for untrusted MDX input.
