const cheerio = require('cheerio');
(async () => {
  const query = 'Conditions de validité de la prière site:islamqa.info';
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  const $ = cheerio.load(html);
  console.log($('body').text().trim().substring(0, 1000));
})();
