export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const headingHtml = value => escapeHtml(value).replace(/All-on-[46]/g,match=>`<span class="no-break">${match}</span>`);

// Keep navigation, booking controls and privacy dialogs identical on every page.
export function pageShell(home, title, description, body, prefix, {article = false, prices = false} = {}) {
  const clean = home.replace(/\s*<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/g, '');
  let head = clean.slice(0, clean.indexOf('<main id="main">'))
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<link rel="preload"[^>]+>/g, '')
    .replace('<body>', `<body class="service-page${article ? ' blog-page' : ''}">`);
  const paths = html => html.replace(/(href|src)="(assets\/|styles\.css|app\.js|site-config\.js|analytics\.js|services\.css|blog\.css|team\.css|services\/|reviews\/|blog\/|doctors\/)/g, `$1="${prefix}$2`)
    .replace(/href="#(solutions|systems|doctor|cost|steps|contacts|reviews|blog|faq|laboratory)"/g, `href="${prefix}index.html#$1"`)
    .replace(/href="#"/g, `href="${prefix}index.html"`);
  head = paths(head).replace('</head>', `<link rel="stylesheet" href="${prefix}services.css">${article && !head.includes('href="blog.css"') ? `\n<link rel="stylesheet" href="${prefix}blog.css">` : ''}\n</head>`);
  if(prices) head = head.replaceAll(`${prefix}index.html#cost`, '#prices');
  return `${head}<main id="main">${body}</main>${paths(clean.slice(clean.indexOf('</main>') + 7))}`;
}
