import sax from 'sax';

export interface DumpPage {
  title: string;
  text: string;
}

export function collectDumpPages(xmlStream: NodeJS.ReadableStream, titlePrefix: string): Promise<DumpPage[]> {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: false });
    const pages: DumpPage[] = [];

    let inPage = false;
    let inTitle = false;
    let inText = false;
    let currentTitle = '';
    let currentText = '';

    parser.on('opentag', (node: { name: string }) => {
      if (node.name === 'page') {
        inPage = true;
        currentTitle = '';
        currentText = '';
      } else if (inPage && node.name === 'title') {
        inTitle = true;
      } else if (inPage && node.name === 'text') {
        inText = true;
      }
    });

    parser.on('text', (text: string) => {
      if (inTitle) currentTitle += text;
      if (inText) currentText += text;
    });

    parser.on('closetag', (name: string) => {
      if (name === 'title') {
        inTitle = false;
      } else if (name === 'text') {
        inText = false;
      } else if (name === 'page') {
        inPage = false;
        if (currentTitle.startsWith(titlePrefix) && currentText.trim()) {
          pages.push({ title: currentTitle, text: currentText });
        }
      }
    });

    parser.on('error', (error: Error) => reject(error));
    parser.on('end', () => resolve(pages));

    xmlStream.pipe(parser as unknown as NodeJS.WritableStream);
  });
}
