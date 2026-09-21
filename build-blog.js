// Runs automatically on every Netlify deploy.
// Reads markdown posts from blog/posts/, generates static HTML pages,
// rebuilds the blog listing page, and rebuilds sitemap.xml.
// You should never need to edit this file.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'blog', 'posts');
const BLOG_DIR = path.join(ROOT, 'blog');
const SITE_URL = 'https://adhdmomtools.netlify.app';

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = data.slug || file.replace(/\.md$/, '');
    return { ...data, slug, body: content };
  });
  posts.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  return posts;
}

function buildFaqBlocks(faq) {
  if (!faq || !faq.length) return { jsonLdBlock: '', htmlBlock: '' };

  const jsonLdItems = faq.map(f => `      {
        "@type": "Question",
        "name": ${JSON.stringify(f.question || '')},
        "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.answer || '')} }
      }`).join(',\n');

  const jsonLdBlock = `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
${jsonLdItems}
    ]
  }
  </script>`;

  const htmlItems = faq.map(f => `      <dt>${esc(f.question)}</dt>\n      <dd>${esc(f.answer)}</dd>`).join('\n');
  const htmlBlock = `<h2>Frequently asked questions</h2>\n    <dl class="blog-faq">\n${htmlItems}\n    </dl>`;

  return { jsonLdBlock, htmlBlock };
}

function buildToolCta(post) {
  if (!post.tool_label || !post.tool_link) return '';
  return `<div class="blog-cta">
      <strong>Try it yourself:</strong> Our free ${esc(post.tool_label)} is built for exactly this.
      <br><a href="${esc(post.tool_link)}">Open the ${esc(post.tool_label)} →</a>
    </div>`;
}

function renderPost(post, template) {
  const { jsonLdBlock, htmlBlock } = buildFaqBlocks(post.faq);
  const bodyHtml = marked.parse(post.body || '');
  const dateIso = post.date || new Date().toISOString().slice(0, 10);

  return template
    .replaceAll('{{TITLE}}', esc(post.title))
    .replaceAll('{{TITLE_JSON}}', JSON.stringify(post.title || ''))
    .replaceAll('{{DESCRIPTION}}', esc(post.description))
    .replaceAll('{{DESCRIPTION_JSON}}', JSON.stringify(post.description || ''))
    .replaceAll('{{SLUG}}', post.slug)
    .replaceAll('{{DATE_ISO}}', dateIso)
    .replaceAll('{{DATE_DISPLAY}}', formatDate(dateIso))
    .replaceAll('{{SHORT_ANSWER}}', esc(post.short_answer))
    .replace('{{BODY_HTML}}', bodyHtml)
    .replace('{{TOOL_CTA_BLOCK}}', buildToolCta(post))
    .replace('{{FAQ_JSONLD_BLOCK}}', jsonLdBlock)
    .replace('{{FAQ_HTML_BLOCK}}', htmlBlock);
}

function buildListing(posts) {
  const items = posts.map(p => `    <div class="blog-list-item">
      <p class="blog-meta">${formatDate(p.date)}</p>
      <h2><a href="/blog/${p.slug}/">${esc(p.title)}</a></h2>
      <p>${esc(p.description)}</p>
    </div>`).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog – ADHD Mom Tools</title>
  <meta name="description" content="Short, practical reads on ADHD, time blindness, routines and executive function for overwhelmed moms.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_URL}/blog/">
  <meta property="og:title" content="Blog – ADHD Mom Tools">
  <meta property="og:description" content="Short, practical reads on ADHD, time blindness, routines and executive function for overwhelmed moms.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${SITE_URL}/blog/">
  <meta property="og:site_name" content="ADHD Mom Tools">

  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="assets/blog.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">
        <span class="logo-icon">🌿</span>
        <span class="logo-text">ADHD Mom Tools</span>
      </a>
      <nav class="main-nav">
        <a href="/" class="nav-btn">Tools</a>
        <a href="/blog/" class="nav-btn active">Blog</a>
      </nav>
    </div>
  </header>

  <main class="blog-wrap">
    <h1>Blog</h1>
    <p style="color:var(--text-soft); margin-bottom: 32px;">Short, practical reads on ADHD, time blindness, routines and executive function.</p>

${items}

  </main>

  <footer style="text-align:center; padding: 24px; color: var(--text-soft); font-size: 0.85rem;">
    <a href="/">← Back to tools</a>
  </footer>
</body>
</html>
`;
}

function buildSitemap(posts) {
  const urls = [
    `  <url>\n    <loc>${SITE_URL}/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
    `  <url>\n    <loc>${SITE_URL}/blog/</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`,
    ...posts.map(p => `  <url>\n    <loc>${SITE_URL}/blog/${p.slug}/</loc>\n    <lastmod>${p.date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function main() {
  const posts = loadPosts();
  const template = fs.readFileSync(path.join(BLOG_DIR, '_template.html'), 'utf8');

  posts.forEach(post => {
    const outDir = path.join(BLOG_DIR, post.slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), renderPost(post, template));
    console.log('Built post:', post.slug);
  });

  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), buildListing(posts));
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(posts));

  console.log(`Done. Built ${posts.length} post(s), blog index, and sitemap.xml.`);
}

main();
