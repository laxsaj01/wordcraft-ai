import React from 'react';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function renderMarkdown(src) {
  if (!src) return '';
  const lines = escapeHtml(src).split('\n');
  const out = [];
  let i = 0;
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushParagraph(); closeList();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      i++;
      out.push(`<pre><code>${code.join('\n')}</code></pre>`);
      continue;
    }
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushParagraph(); closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushParagraph(); closeList();
      out.push('<hr/>');
      i++; continue;
    }
    if (trimmed.startsWith('&gt;')) {
      flushParagraph(); closeList();
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('&gt;')) {
        quote.push(lines[i].trim().replace(/^&gt;\s?/, ''));
        i++;
      }
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }
    const ul = trimmed.match(/^[-*+]\s+(.*)$/);
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushParagraph();
      const type = ul ? 'ul' : 'ol';
      if (listType !== type) { closeList(); out.push(`<${type}>`); listType = type; }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
      i++; continue;
    }
    if (!trimmed) {
      flushParagraph(); closeList();
      i++; continue;
    }
    paragraph.push(trimmed);
    i++;
  }
  flushParagraph(); closeList();
  return out.join('\n');
}

export default function Markdown({ content }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(content || '') }} />;
}
