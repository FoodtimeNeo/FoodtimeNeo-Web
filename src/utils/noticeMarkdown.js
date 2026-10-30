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
