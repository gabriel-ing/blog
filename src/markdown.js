import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import yaml from 'js-yaml';
import MarkdownIt from 'markdown-it';
import json from 'highlight.js/lib/languages/json';
import markdownLanguage from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yamlLanguage from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdownLanguage);
hljs.registerLanguage('md', markdownLanguage);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('py', python);
hljs.registerLanguage('python', python);
hljs.registerLanguage('text', plaintext);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yamlLanguage);
hljs.registerLanguage('yml', yamlLanguage);

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, info) {
    const language = info.split(',')[0].trim().toLowerCase();

    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs language-${language}"><code class="language-${language}">${hljs.highlight(code, { language }).value}</code></pre>`;
    }

    return `<pre class="hljs"><code>${markdown.utils.escapeHtml(code)}</code></pre>`;
  },
});

const defaultFenceRenderer =
  markdown.renderer.rules.fence ??
  ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
const defaultImageRenderer =
  markdown.renderer.rules.image ??
  ((tokens, index, options, env, self) => self.renderToken(tokens, index, options));

markdown.renderer.rules.fence = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const [language = '', modifier = ''] = token.info
    .split(',')
    .map((part) => part.trim().toLowerCase());

  if (language === 'html' && modifier === 'render') {
    return `<div class="render-block" data-render-html>${token.content}</div>`;
  }

  if (language === 'mermaid') {
    return `<div class="mermaid-block" data-mermaid>${markdown.utils.escapeHtml(token.content)}</div>`;
  }

  return defaultFenceRenderer(tokens, index, options, env, self);
};

markdown.renderer.rules.image = (tokens, index, options, env, self) => {
  const token = tokens[index];
  const source = token.attrGet('src');

  if (source && env.resolveAssetUrl) {
    token.attrSet('src', env.resolveAssetUrl(source));
  }

  return defaultImageRenderer(tokens, index, options, env, self);
};

export function parseMarkdownDocument(source) {
  const normalizedSource = source.replace(/\r\n/g, '\n');
  const frontmatterMatch = normalizedSource.match(/^---\n([\s\S]*?)\n---\n*/);

  if (!frontmatterMatch) {
    return {
      metadata: {},
      content: normalizedSource.trim(),
    };
  }

  const [, frontmatterBlock] = frontmatterMatch;

  return {
    metadata: yaml.load(frontmatterBlock) ?? {},
    content: normalizedSource.slice(frontmatterMatch[0].length).trim(),
  };
}

export function renderMarkdown(content, options = {}) {
  const renderedHtml = markdown.render(content, options);

  if (!options.resolveAssetUrl) {
    return renderedHtml;
  }

  return renderedHtml.replace(
    /<img\b([^>]*?)\ssrc=(['"])(.*?)\2([^>]*)>/gi,
    (_match, before, quote, source, after) =>
      `<img${before} src=${quote}${options.resolveAssetUrl(source)}${quote}${after}>`,
  );
}

export function buildExcerpt(content) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
    .replace(/\s+\S*$/, '');
}

export function formatDate(value) {
  if (!value) {
    return 'Undated';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
