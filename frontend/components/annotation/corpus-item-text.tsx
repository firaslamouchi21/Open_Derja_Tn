"use client";

import { useRef, type MouseEvent } from "react";
import type { Script } from "@open-derja/shared";
import { scriptTextProps } from "../../lib/i18n/direction";
import { cn } from "../../lib/utils";

export type CorpusItemTextSpan = {
  id: string;
  char_start: number;
  char_end: number;
  className?: string;
};

export type CorpusItemTextProps = {
  text: string;
  script: Script;
  spans?: CorpusItemTextSpan[];
  onSelect?: (span: { char_start: number; char_end: number }) => void;
  className?: string;
};

function offsetWithinContainer(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  return total;
}

export function CorpusItemText({ text, script, spans = [], onSelect, className }: CorpusItemTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { dir, lang } = scriptTextProps(script);

  const sorted = [...spans].sort((a, b) => a.char_start - b.char_start);
  const chunks: { text: string; span?: CorpusItemTextSpan }[] = [];
  let cursor = 0;
  for (const span of sorted) {
    if (span.char_start > cursor) chunks.push({ text: text.slice(cursor, span.char_start) });
    chunks.push({ text: text.slice(span.char_start, span.char_end), span });
    cursor = span.char_end;
  }
  if (cursor < text.length) chunks.push({ text: text.slice(cursor) });

  function handleMouseUp(_event: MouseEvent<HTMLDivElement>) {
    if (!onSelect || !containerRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const char_start = offsetWithinContainer(containerRef.current, range.startContainer, range.startOffset);
    const char_end = offsetWithinContainer(containerRef.current, range.endContainer, range.endOffset);
    if (char_end > char_start) onSelect({ char_start, char_end });
  }

  return (
    <div
      ref={containerRef}
      dir={dir}
      lang={lang}
      onMouseUp={handleMouseUp}
      className={cn("leading-relaxed", className)}
    >
      {chunks.map((chunk, index) =>
        chunk.span ? (
          <mark
            key={chunk.span.id}
            className={cn("rounded-sm bg-primary/20 px-0.5", chunk.span.className)}
          >
            {chunk.text}
          </mark>
        ) : (
          <span key={index}>{chunk.text}</span>
        ),
      )}
    </div>
  );
}
