function stripBalanced(text: string, open: string, close: string): string {
  let result = '';
  let depth = 0;
  let i = 0;

  while (i < text.length) {
    if (text.startsWith(open, i)) {
      depth += 1;
      i += open.length;
      continue;
    }
    if (depth > 0 && text.startsWith(close, i)) {
      depth -= 1;
      i += close.length;
      continue;
    }
    if (depth === 0) {
      result += text[i];
    }
    i += 1;
  }

  return result;
}

function replaceWikiLinks(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(/\[\[([^[\]|]*)\|([^[\]]*)\]\]/g, '$2');
    current = current.replace(/\[\[([^[\]]*)\]\]/g, '$1');
  } while (current !== previous);
  return current;
}

function replaceExternalLinks(text: string): string {
  let result = text.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]*)\]/g, '$2');
  result = result.replace(/\[(https?:\/\/[^\s\]]+)\]/g, '');
  return result;
}

function stripLeadingRedirect(text: string): string {
  return text.replace(/^\s*#\s*redirect\s*:?\s*\[\[[^[\]]*\]\]\s*/i, '');
}

function stripHtmlComments(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(/<!--[\s\S]*?-->/g, '');
  } while (current !== previous);
  return current;
}

export function stripWikitext(wikitext: string): string {
  let text = stripLeadingRedirect(wikitext);

  text = stripHtmlComments(text);
  text = text.replace(/<ref[^>]*\/>/gi, '');
  text = text.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  text = stripBalanced(text, '{{', '}}');
  text = text.replace(/\[\[Category:[^[\]]*\]\]/gi, '');
  text = text.replace(/\[\[File:[^[\]]*\]\]/gi, '');
  text = text.replace(/\[\[Image:[^[\]]*\]\]/gi, '');
  text = replaceWikiLinks(text);
  text = replaceExternalLinks(text);
  text = text.replace(/'''''/g, '');
  text = text.replace(/'''/g, '');
  text = text.replace(/''/g, '');
  text = text.replace(/^=+\s*(.*?)\s*=+$/gm, '$1');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/^\s*[*#:;]+\s*/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
