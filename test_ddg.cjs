const cheerio = require('cheerio');
(async () => {
  const query = "Conditions de validité de la prière site:islamqa.info OR site:islamweb.net OR site:mahadsunnah.com OR site:islamqa.org OR site:sunnisme.com OR site:doctrine-malikite.fr OR site:dar-alifta.org";
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log("Fetching: " + searchUrl);
  
  const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  console.log("HTML length:", html.length);
  const $ = cheerio.load(html);
  let c = 0;
  $('.result__a').each((i, el) => {
      console.log($(el).text(), $(el).attr('href'));
      c++;
  });
  console.log("Total results:", c);
})();
