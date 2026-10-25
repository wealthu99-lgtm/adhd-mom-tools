// Runs automatically on every Netlify deploy (npm run build).
// Generates: one page per tool, every blog post, the blog index, the home page
// header/footer/tool grid/latest posts, a 404 page and sitemap.xml.
// You should never need to edit this file. Tool wording lives in scripts/tools-content.js.

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { TOOLS, LINKS } = require('./tools-content.js');

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, 'blog');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');
const SITE_URL = 'https://adhdmomtools.netlify.app';
const SITE_NAME = 'ADHD Mom Tools';
const OG_IMAGE = SITE_URL + '/images/ebook-mockup.jpg';

// Old blog links used "/#timer" style anchors. Map them to the real pages.
const LEGACY = {
  '/#timer': '/adhd-focus-timer/', '/#braindump': '/adhd-brain-dump/', '/#threemusts': '/todays-3-musts/',
  '/#nextaction': '/what-should-i-do-now/', '/#timeblock': '/adhd-time-blocker/', '/#routine': '/adhd-routine-builder/'
};

function esc(str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function jsonLd(obj) { return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>'; }
function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
function fill(template, map) {
  return template.replace(/\{\{(\w+)\}\}/g, (m, k) => (map[k] !== undefined ? map[k] : m));
}
function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}
function toolUrl(t) { return '/' + t.slug + '/'; }
function toolById(id) { return TOOLS.find(t => t.id === id); }

/* ---------- shared layout ---------- */
function headerHtml(activeKey) {
  const links = TOOLS.map(t => `<a class="nav-link" href="${toolUrl(t)}"${activeKey === t.id ? ' aria-current="page"' : ''}>${esc(t.nav)}</a>`).join('');
  return `<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a href="/" class="logo"><span class="logo-mark" aria-hidden="true">🌿</span><span>${SITE_NAME}</span></a>
    <button class="menu-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="main-nav">☰</button>
    <nav id="main-nav" class="main-nav" aria-label="Main">
      ${links}<a class="nav-link" href="/blog/"${activeKey === 'blog' ? ' aria-current="page"' : ''}>Blog</a>
    </nav>
  </div>
</header>`;
}

function footerHtml() {
  const tools = TOOLS.map(t => `<li><a href="${toolUrl(t)}">${esc(t.name)}</a></li>`).join('');
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="/" class="logo"><span class="logo-mark" aria-hidden="true">🌿</span><span>${SITE_NAME}</span></a>
        <p>Free, calm tools for moms with ADHD. No signup, no ads, and everything stays on your device.</p>
        <button id="install-btn" type="button" class="btn btn-secondary btn-sm hidden">📲 Install the app</button>
      </div>
      <div><h4>Free tools</h4><ul>${tools}</ul></div>
      <div><h4>Resources</h4><ul>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="${LINKS.reset}" target="_blank" rel="noopener">Free 7-Day Reset</a></li>
        <li><a href="${LINKS.planner}" target="_blank" rel="noopener">ADHD Planner</a></li>
        <li><a href="${LINKS.ebook}" target="_blank" rel="noopener">Survival Ebook</a></li>
        <li><a href="${LINKS.bundle}" target="_blank" rel="noopener">Ebook + Planner Bundle</a></li>
      </ul></div>
    </div>
    <p class="footer-note">These tools are for support and organization only. They are not medical advice, diagnosis or treatment. If you are struggling, please talk to a doctor or therapist. In the US you can call or text 988 at any time.</p>
  </div>
</footer>`;
}

function headBlock(o) {
  const url = SITE_URL + o.path;
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<meta name="robots" content="${o.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<meta name="theme-color" content="#3f7d68">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="ADHD Tools">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:image" content="${o.image || OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${o.image || OG_IMAGE}">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<meta name="application-name" content="ADHD Mom Tools">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
${(o.jsonLd || []).map(jsonLd).join('\n')}`;
}

function crumbLd(items) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE_URL + it[1] }))
  };
}
function faqLd(faq) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } }))
  };
}

/* ---------- tool pages ---------- */
function ctaBox(cta) {
  const btns = cta.buttons.map(b => `<a class="btn btn-${b[2]}" href="${b[1]}" target="_blank" rel="noopener">${esc(b[0])}</a>`).join('');
  return `<div class="cta-box"><h3>${esc(cta.title)}</h3><p>${esc(cta.text)}</p><div class="btn-row">${btns}</div></div>`;
}

function renderTool(t, posts) {
  const steps = t.steps.map(s => `<li><strong>${esc(s[0])}</strong><span>${esc(s[1])}</span></li>`).join('');
  const why = t.why.map(w => `<li>${esc(w)}</li>`).join('');
  const faq = t.faq.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('');
  const related = t.related.map(id => toolById(id)).filter(Boolean).map(r =>
    `<a class="related-card" href="${toolUrl(r)}"><span class="tool-icon ${r.tint}" aria-hidden="true">${r.icon}</span>${esc(r.name)}</a>`).join('');
  const guidePosts = (t.guides || []).map(slug => posts.find(p => p.slug === slug)).filter(Boolean);
  const guides = guidePosts.length
    ? `<h2>Read more</h2><ul class="guide-links">${guidePosts.map(p => `<li><a href="/blog/${p.slug}/">${esc(p.title)}</a></li>`).join('')}</ul>` : '';

  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, url: SITE_URL + toolUrl(t),
      description: t.description, applicationCategory: 'LifestyleApplication', operatingSystem: 'Any (web browser)',
      isAccessibleForFree: true, inLanguage: 'en', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
    },
    faqLd(t.faq),
    crumbLd([['Home', '/'], [t.name, toolUrl(t)]])
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title: t.title, description: t.description, path: toolUrl(t), jsonLd: ld })}
</head>
<body>
${headerHtml(t.id)}
<main id="main">
  <section class="tool-hero">
    <div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <span>${esc(t.name)}</span></nav>
      <div class="tool-icon ${t.tint}" aria-hidden="true">${t.icon}</div>
      <h1>${esc(t.h1)}</h1>
      <p class="tool-lead">${esc(t.lead)}</p>
    </div>
  </section>
  <div class="container narrow">
    ${t.app}
    <div class="prose">
      <h2>${esc(t.stepsTitle)}</h2>
      <ol class="steps">${steps}</ol>
      <h2>${esc(t.whyTitle)}</h2>
      <ul>${why}</ul>
      ${ctaBox(t.cta)}
      <h2>Frequently asked questions</h2>
      <div class="faq">${faq}</div>
      ${guides}
      <h2>More free tools</h2>
      <div class="related-grid">${related}</div>
    </div>
  </div>
</main>
${footerHtml()}
<noscript><p style="text-align:center;padding:1rem">These tools need JavaScript. Please turn it on in your browser.</p></noscript>
<script src="/js/app.js" defer></script>
</body>
</html>
`;
}

/* ---------- blog ---------- */
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const posts = files.map(file => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = data.slug || file.replace(/\.md$/, '');
    let date = data.date;
    if (date instanceof Date) date = date.toISOString().slice(0, 10);
    return Object.assign({}, data, { slug: slug, date: String(date || '2026-01-01').slice(0, 10), body: content });
  });
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function postCard(p, tag) {
  const h = tag || 'h3';
  return `<a class="post-card" href="/blog/${p.slug}/"><p class="blog-meta">${formatDate(p.date)}</p><${h}>${esc(p.title)}</${h}><p>${esc(p.description)}</p></a>`;
}

function renderPost(post, template, posts) {
  const url = SITE_URL + '/blog/' + post.slug + '/';
  const faq = post.faq && post.faq.length ? post.faq : [];
  const faqHtml = faq.length
    ? `<h2>Frequently asked questions</h2><dl class="blog-faq">${faq.map(f => `<dt>${esc(f.question)}</dt><dd>${esc(f.answer)}</dd>`).join('')}</dl>` : '';
  const toolLink = LEGACY[post.tool_link] || post.tool_link;
  const cta = post.tool_label && toolLink
    ? `<div class="blog-cta"><strong>Try it yourself:</strong> our free ${esc(post.tool_label)} is built for exactly this.<br><a class="btn btn-primary" href="${esc(toolLink)}">Open the ${esc(post.tool_label)} →</a></div>` : '';
  const others = posts.filter(p => p.slug !== post.slug).slice(0, 3);
  const relatedPosts = others.length ? `<h2>More from the blog</h2><div class="post-list">${others.map(p => postCard(p)).join('')}</div>` : '';
  const pin = 'https://www.pinterest.com/pin/create/button/?url=' + encodeURIComponent(url) + '&media=' + encodeURIComponent(OG_IMAGE) + '&description=' + encodeURIComponent(post.title);

  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.description,
      image: [OG_IMAGE], datePublished: post.date, dateModified: post.date, mainEntityOfPage: url,
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
    },
    crumbLd([['Home', '/'], ['Blog', '/blog/'], [post.title, '/blog/' + post.slug + '/']])
  ];
  if (faq.length) ld.push(faqLd(faq.map(f => [f.question, f.answer])));

  return fill(template, {
    HEAD: headBlock({ title: (post.title.length + SITE_NAME.length + 3 <= 62 ? post.title + ' – ' + SITE_NAME : post.title), description: post.description, path: '/blog/' + post.slug + '/', ogType: 'article', jsonLd: ld }),
    HEADER: headerHtml('blog'),
    FOOTER: footerHtml(),
    TITLE: esc(post.title),
    SLUG: post.slug,
    DATE_ISO: post.date,
    DATE_DISPLAY: formatDate(post.date),
    SHORT_ANSWER: esc(post.short_answer),
    TOOL_CTA_BLOCK: cta,
    FAQ_HTML_BLOCK: faqHtml,
    PIN_URL: esc(pin),
    RELATED_POSTS: relatedPosts,
    BODY_HTML: marked.parse(post.body || '')
  });
}

function renderBlogIndex(posts) {
  const title = 'ADHD Mom Blog – Practical Guides on Focus, Overwhelm & Routines';
  const desc = 'Short, practical reads on ADHD time blindness, task paralysis, brain dumps, routines and executive function for overwhelmed moms.';
  const ld = [crumbLd([['Home', '/'], ['Blog', '/blog/']])];
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title: title, description: desc, path: '/blog/', jsonLd: ld })}
</head>
<body>
${headerHtml('blog')}
<main id="main">
  <section class="blog-hero"><div class="container narrow"><h1>The ADHD Mom Blog</h1><p>Short, practical reads on focus, overwhelm and routines.</p></div></section>
  <div class="container narrow" style="padding-top:2rem">
    <div class="post-list">${posts.map(p => postCard(p, 'h2')).join('')}</div>
  </div>
</main>
${footerHtml()}
<script src="/js/app.js" defer></script>
</body>
</html>
`;
}

/* ---------- home injection, 404, sitemap ---------- */
function toolGrid() {
  return TOOLS.map(t => `<a class="tool-card" href="${toolUrl(t)}">
  <span class="tool-icon ${t.tint}" aria-hidden="true">${t.icon}</span>
  <h3>${esc(t.name)}</h3>
  <p>${esc(t.cardText)}</p>
  <span class="card-cta">${esc(t.cardCta)}</span>
</a>`).join('\n');
}

function buildHome(posts) {
  const file = path.join(ROOT, 'index.html');
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  const latest = posts.slice(0, 3).map(p => postCard(p)).join('');
  const map = { '<!--NEXT_WIDGET-->': toolById('next').app, '<!--SITE_HEADER-->': headerHtml(''), '<!--SITE_FOOTER-->': footerHtml(), '<!--TOOL_GRID-->': toolGrid(), '<!--LATEST_POSTS-->': latest };
  Object.keys(map).forEach(k => { html = html.split(k).join(map[k]); });
  fs.writeFileSync(file, html);
}

function build404() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title: 'Page not found – ' + SITE_NAME, description: 'That page could not be found. Try one of our free ADHD tools.', path: '/404.html', noindex: true })}
</head>
<body>
${headerHtml('')}
<main id="main">
  <section class="tool-hero"><div class="container">
    <h1>That page wandered off</h1>
    <p class="tool-lead">No worries, it happens. Here are the tools you were probably looking for.</p>
  </div></section>
  <div class="container" style="padding:1.5rem 1.25rem 3rem"><div class="tool-grid">${toolGrid()}</div></div>
</main>
${footerHtml()}
<script src="/js/app.js" defer></script>
</body>
</html>
`;
  write('404.html', html);
}

function buildSitemap(posts) {
  const urls = [
    { loc: SITE_URL + '/', priority: '1.0' },
    ...TOOLS.map(t => ({ loc: SITE_URL + toolUrl(t), priority: '0.9' })),
    { loc: SITE_URL + '/blog/', priority: '0.8' },
    ...posts.map(p => ({ loc: SITE_URL + '/blog/' + p.slug + '/', lastmod: p.date, priority: '0.7' }))
  ];
  const body = urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <priority>${u.priority}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}


function buildManifest() {
  const shortcut = (id, name) => { const t = toolById(id); return { name: name, url: toolUrl(t), icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }; };
  return JSON.stringify({
    name: SITE_NAME, short_name: 'ADHD Tools',
    description: 'Free, calm tools for moms with ADHD: focus timer, brain dump, daily top 3 and more.',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#f7f5f0', theme_color: '#3f7d68',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    shortcuts: [shortcut('timer', 'Focus timer'), shortcut('brain', 'Brain dump'), shortcut('musts', 'Today’s 3 Musts')]
  }, null, 2);
}

// Offline support. The cache name changes on every deploy, so visitors always get fresh files.
function buildServiceWorker() {
  const urls = ['/', '/blog/'].concat(TOOLS.map(toolUrl), ['/css/style.css', '/js/app.js', '/manifest.webmanifest', '/icons/icon-192.png']);
  return `// Generated at build time. Do not edit.
const CACHE = 'adhd-mom-tools-${Date.now()}';
const PRECACHE = ${JSON.stringify(urls)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/admin') === 0 || url.pathname.indexOf('/.netlify') === 0) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('/'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
`;
}

function main() {
  const posts = loadPosts();
  const template = fs.readFileSync(path.join(BLOG_DIR, '_template.html'), 'utf8');

  TOOLS.forEach(t => { write(t.slug + '/index.html', renderTool(t, posts)); console.log('Built tool:', t.slug); });
  posts.forEach(p => { write('blog/' + p.slug + '/index.html', renderPost(p, template, posts)); console.log('Built post:', p.slug); });
  write('blog/index.html', renderBlogIndex(posts));
  buildHome(posts);
  build404();
  write('sitemap.xml', buildSitemap(posts));
  write('manifest.webmanifest', buildManifest());
  write('sw.js', buildServiceWorker());
  console.log('Done: ' + TOOLS.length + ' tools, ' + posts.length + ' posts, home, blog index, 404, sitemap.');
}

main();
