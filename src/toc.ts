import type { VFileCompatible } from 'vfile';

export type TocItem = {
    depth: number;
    text: string;
    id: string;
    children: TocItem[];
};

function generateTableOfContents(markdown: VFileCompatible): TocItem[] {
    const toc: TocItem[] = [];
    const lines = markdown.toString().split('\n').filter(line => line.trim() !== '').map(line => line.trim());
    const heading_regex = /^#{1,6}\s+(.+)$/
    const heading_stack: TocItem[] = [];
    for (const line of lines) {
        const heading_match = line.match(heading_regex);
        if (heading_match) {
            const heading = heading_match[1];
            if (heading_match[0].match(/^#+/) === null) {
                throw new Error(`Invalid heading: ${heading_match[0]} \n on line: ${line}`);
            }
            // @ts-ignore - matching does see the if statement above
            const depth = heading_match[0].match(/^#+/)[0].length;
            const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const item: TocItem = {
                depth,
                text: heading,
                id,
                children: []
            };
            if (heading_stack.length === 0) {
                toc.push(item);
            } else {
                const parent = heading_stack[heading_stack.length - 1];
                parent.children.push(item);
            }
            heading_stack.push(item);
        }
    }
    return toc;
};

export default generateTableOfContents;