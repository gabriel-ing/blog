import { buildExcerpt, formatDate, parseMarkdownDocument, renderMarkdown } from './markdown.js';

const postModules = import.meta.glob('../content/posts/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});
const postAssetModules = import.meta.glob('../content/posts/**/*.{png,jpg,jpeg,gif,svg,webp,avif}', {
  eager: true,
  import: 'default',
});

const posts = Object.entries(postModules)
  .map(([filePath, source]) => createPostRecord(filePath, source))
  .sort(sortPostsByDate);
let mermaidPromise;

export function createBlogApp(root) {
  const renderRoute = async () => {
    const slug = getPostSlug(location.hash);

    root.innerHTML = slug ? renderPostPage(slug) : renderHomePage();
    activateRenderBlocks(root);
    await renderMermaidBlocks(root);

    window.scrollTo({ top: 0, left: 0 });
  };

  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

function createPostRecord(filePath, source) {
  const slug = filePath
    .replace('../content/posts/', '')
    .replace(/\.md$/, '')
    .replace(/\\/g, '/');
  const { metadata, content } = parseMarkdownDocument(source);
  const title = typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title.trim() : humanizeSlug(slug);
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : typeof metadata.tags === 'string'
      ? metadata.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

  return {
    slug,
    sourcePath: normalizePath(filePath),
    title,
    date: metadata.date ?? '',
    tags,
    description:
      typeof metadata.description === 'string' && metadata.description.trim()
        ? metadata.description.trim()
        : buildExcerpt(content),
    content,
  };
}

function sortPostsByDate(left, right) {
  const leftValue = new Date(left.date).getTime();
  const rightValue = new Date(right.date).getTime();

  if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
    return left.title.localeCompare(right.title);
  }

  if (Number.isNaN(leftValue)) {
    return 1;
  }

  if (Number.isNaN(rightValue)) {
    return -1;
  }

  return rightValue - leftValue;
}

function getPostSlug(hashValue) {
  const route = hashValue.replace(/^#\/?/, '');

  if (!route) {
    return '';
  }

  return route.startsWith('posts/') ? route.slice('posts/'.length) : route;
}

function renderHomePage() {
  return `
    <div class="shell">
      <header class="hero-panel">
        <div class="hero-grid">
          <div>
          <h1>Gabriel Quazzaing's Blog</h1>
          </div>
          <div class="hero-notes">
            <p>

            </p>
          </div>
        </div>
      </header>

      <main class="page-grid">
        <section class="panel panel-wide">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Posts</p>
              <h2>${posts.length} published ${posts.length === 1 ? 'entry' : 'entries'}</h2>
            </div>
            <p class="section-copy">
              Newest first, with each entry rendered as a standalone post view.
            </p>
          </div>
          <div class="post-list">
            ${posts.map((post, index) => renderPostCard(post, index)).join('')}
          </div>
        </section>

      </main>
    </div>
  `;
}

function renderPostCard(post, index) {
  return `
    <article class="post-card">
      <div class="post-card-index">${String(index + 1).padStart(2, '0')}</div>
      <div class="post-meta">
        <span>${escapeHtml(formatDate(post.date))}</span>
        <span>${post.tags.length ? escapeHtml(post.tags.join(' · ')) : 'No tags yet'}</span>
      </div>
      <h3><a href="#/posts/${encodeURI(post.slug)}">${escapeHtml(post.title)}</a></h3>
      <p>${escapeHtml(post.description)}</p>
      <a class="post-link" href="#/posts/${encodeURI(post.slug)}">Read post</a>
    </article>
  `;
}

function renderPostPage(slug) {
  const post = posts.find((entry) => entry.slug === slug);

  if (!post) {
    return `
      <div class="shell shell-narrow">
        <main class="panel">
          <p class="section-kicker">Not found</p>
          <h1>This post does not exist.</h1>
          <p class="section-copy">Check the URL or head back to the homepage.</p>
          <a class="button-link" href="#/">Back to all posts</a>
        </main>
      </div>
    `;
  }

  return `
    <div class="shell shell-narrow">
      <a class="back-link" href="#/">← All posts</a>
      <article class="panel article-shell">
        <header class="article-header">
          <p class="section-kicker">Article</p>
          <div class="post-meta">
            <span>${escapeHtml(formatDate(post.date))}</span>
            <span>${escapeHtml(post.tags.join(' · ') || 'Uncategorized')}</span>
          </div>
          <h1>${escapeHtml(post.title)}</h1>
          <p class="article-description">${escapeHtml(post.description)}</p>
        </header>
        <div class="article-content">
          ${renderMarkdown(post.content, {
            resolveAssetUrl: (source) => resolvePostAsset(post.sourcePath, source),
          })}
        </div>
      </article>
    </div>
  `;
}

function activateRenderBlocks(root) {
  for (const block of root.querySelectorAll('[data-render-html]')) {
    for (const script of block.querySelectorAll('script')) {
      const replacement = document.createElement('script');

      for (const { name, value } of script.attributes) {
        replacement.setAttribute(name, value);
      }

      replacement.textContent = script.textContent;
      script.replaceWith(replacement);
    }
  }
}

async function renderMermaidBlocks(root) {
  const blocks = [...root.querySelectorAll('[data-mermaid]')];

  if (!blocks.length) {
    return;
  }

  const mermaid = await getMermaid();

  for (const [index, block] of blocks.entries()) {
    const definition = block.textContent ?? '';
    const { svg } = await mermaid.render(`mermaid-${Date.now()}-${index}`, definition);
    block.innerHTML = svg;
  }
}

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => {
      const mermaid = module.default;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: {
          background: '#090015',
          primaryColor: '#24003a',
          primaryTextColor: '#fae5ff',
          primaryBorderColor: '#d1abf3',
          lineColor: '#6fade9',
          secondaryColor: '#110001',
          tertiaryColor: '#00153c',
          tertiaryTextColor: '#d7f2ff',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
      });

      return mermaid;
    });
  }

  return mermaidPromise;
}

function resolvePostAsset(sourcePath, assetPath) {
  if (!isRelativeAssetUrl(assetPath)) {
    return assetPath;
  }

  const resolvedPath = resolveRelativePath(sourcePath, assetPath);

  return postAssetModules[resolvedPath] ?? assetPath;
}

function resolveRelativePath(sourcePath, assetPath) {
  const segments = [...normalizePath(sourcePath).split('/').slice(0, -1), ...assetPath.split('/')];
  const resolved = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      resolved.pop();
      continue;
    }

    resolved.push(segment);
  }

  return resolved.join('/');
}

function isRelativeAssetUrl(assetPath) {
  return (
    assetPath &&
    !assetPath.startsWith('#') &&
    !assetPath.startsWith('/') &&
    !assetPath.startsWith('data:') &&
    !/^[a-z]+:/i.test(assetPath)
  );
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function humanizeSlug(slug) {
  return slug
    .split('/')
    .at(-1)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
