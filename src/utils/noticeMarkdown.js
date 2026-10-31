import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const markdown = new MarkdownIt({ html: false, breaks: false, linkify: false });
markdown.validateLink = (url) => /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(url);

export function renderNoticeMarkdown(content) {
  return DOMPurify.sanitize(markdown.render(content || ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['style'],
  });
}

export function noticeHeading(content) {
  const tokens = markdown.parse(content || '', {});
  let level = 7,
    title = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'heading_open' || Number(token.tag.slice(1)) >= level)
      continue;
    level = Number(token.tag.slice(1));
    title = (tokens[i + 1]?.children || [])
      .map((t) =>
        ['text', 'code_inline'].includes(t.type)
          ? t.content
          : t.type === 'image'
            ? t.content
            : ['softbreak', 'hardbreak'].includes(t.type)
              ? ' '
              : '',
      )
      .join('')
      .trim();
  }
  return title;
}
