import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const baseUrl = 'https://anistreamhindi.in';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY in GitHub Actions secrets.');

const slugify = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'anime';
const files = await fs.readdir(root, { withFileTypes: true });
await fs.mkdir(dist, { recursive: true });
for (const entry of files) {
  if (['.git', '.github', 'dist', 'node_modules'].includes(entry.name) || entry.name === 'scripts') continue;
  const src = path.join(root, entry.name);
  const dst = path.join(dist, entry.name);
  if (entry.isDirectory()) await fs.cp(src, dst, { recursive: true });
  else if (entry.isFile()) await fs.copyFile(src, dst);
}

const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/anime?select=anime_id,id,title,description`;
const response = await fetch(endpoint, { headers: { apikey: supabaseKey } });
if (!response.ok) throw new Error(`Supabase anime query failed (${response.status}): ${await response.text()}`);
const animeRows = await response.json();
if (!Array.isArray(animeRows)) throw new Error('Supabase did not return an anime list.');
const detailTemplate = await fs.readFile(path.join(root, 'anime-details.html'), 'utf8').catch(async () =>
  fs.readFile(path.join(root, 'anime-details (1).html'), 'utf8'));
const seen = new Set();
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
const urls = [`${baseUrl}/`];
for (const anime of animeRows) {
  const id = String(anime.anime_id ?? anime.id ?? '').trim();
  if (!id) continue;
  let slug = slugify(anime.anime_id || anime.id || anime.title);
  if (seen.has(slug)) slug = `${slug}-${slugify(id)}`;
  seen.add(slug);
  const dir = path.join(dist, 'anime', slug);
  await fs.mkdir(dir, { recursive: true });
  const injected = `<script>window.ANISTREAM_ROUTE_ANIME_ID=${JSON.stringify(id)};</script>\n`;
  const title = `${anime.title || 'Anime'} Hindi Dub, Episodes & Details — AniStream Hindi`;
  const description = String(anime.description || `Explore ${anime.title || 'this anime'} details, episodes and available languages on AniStream Hindi.`).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
  const canonical = `${baseUrl}/anime/${slug}/`;
  let page = detailTemplate.replace('<script>\n/* ===================================\n   SUPABASE CONFIGURATION', `${injected}<script>\n/* ===================================\n   SUPABASE CONFIGURATION`);
  page = page.replace('<title>Anime Details — AniStream Hindi</title>', `<title>${escapeHtml(title)}</title>`);
  page = page.replace('<meta name="description" content="Explore anime details, episodes and Hindi dub information on AniStream Hindi.">', `<meta name="description" content="${escapeHtml(description)}">`);
  page = page.replace('href="https://anistreamhindi.in/"', `href="${canonical}"`);
  page = page.replace('content="Anime Details — AniStream Hindi"', `content="${escapeHtml(title)}"`);
  page = page.replace('content="Explore anime details and episodes on AniStream Hindi."', `content="${escapeHtml(description)}"`);
  page = page.replace('content="https://anistreamhindi.in/"', `content="${canonical}"`);
  await fs.writeFile(path.join(dir, 'index.html'), page);
  urls.push(`${baseUrl}/anime/${slug}/`);
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${url.endsWith('/') && url === `${baseUrl}/` ? '1.0' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(path.join(dist, 'sitemap.xml'), xml);
console.log(`Generated ${animeRows.length} anime route candidates and ${urls.length} sitemap URLs.`);
