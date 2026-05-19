---
title: Rendering live HTML from markdown
date: 2026-05-18
tags:
  - html
  - scripts
  - demos
description: Use html,render blocks when you want embedded HTML and script tags to execute inside a post.
---

Sometimes a blog post needs something more interactive than a code sample. For those cases, use an `html,render` fence.

```html,render
<div class="playground">
  <button type="button" data-demo-button>Increment</button>
  <strong data-demo-value>0</strong>
</div>
<script>
  const scope = document.currentScript.parentElement;
  const button = scope.querySelector('[data-demo-button]');
  const output = scope.querySelector('[data-demo-value]');
  let count = 0;

  button.addEventListener('click', () => {
    count += 1;
    output.textContent = count;
  });
</script>
```

The block above renders directly into the article, including the script tag.

You can still show the source code separately if you want readers to see the implementation:

```html
<div class="playground">
  <button type="button">Increment</button>
  <strong>0</strong>
</div>
```
