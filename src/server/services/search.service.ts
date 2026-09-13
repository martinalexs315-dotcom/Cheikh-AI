import * as cheerio from 'cheerio';

export const LEVEL_1_DOMAINS = [
  'islamqa.info',
  'islamweb.net',
  'mahadsunnah.com',
  'islamqa.org',
  'sunnisme.com',
  'doctrine-malikite.fr',
  'dar-alifta.org',
  'sunnah.com',
  'quran.com',
  'altafsir.com',
  'dorar.net',
  'binbaz.org.sa',
  'ibnothaimeen.net',
  'al-eman.com',
  'islamhouse.com',
  'islamonline.net',
  'al-ifta.gov.sa',
  'shamela.ws',
  'as-salat.com',
  'hadithunlocked.com'
];

export const LEVEL_2_DOMAINS = [
  'fr.wikipedia.org',
  'cairn.info',
  'persee.fr',
  'gallica.bnf.fr',
  'lescahiersdelislam.fr',
  'imarabe.org',
  'oumma.com',
  'saphirnews.com',
  'mizane.info',
  'ajib.fr',
  'katib.fr',
  'larousse.fr',
  'universalis.fr'
];

export interface SearchSource {
  id: number;
  domain: string;
  title: string;
  url: string;
  content: string;
  sourceType: string;
}

export function getDomainType(hostname: string): string {
  if (hostname.includes('islamqa.info')) return 'Source Religieuse (Fatwa)';
  if (hostname.includes('islamweb.net')) return 'Source Religieuse (Fatwa)';
  if (hostname.includes('mahadsunnah.com')) return 'Source Religieuse (Générale)';
  if (hostname.includes('islamqa.org')) return 'Source Religieuse (Fiqh)';
  if (hostname.includes('sunnisme.com')) return 'Source Religieuse (Générale)';
  if (hostname.includes('doctrine-malikite.fr')) return 'Source Juridique (École Malikite)';
  if (hostname.includes('dar-alifta.org') || hostname.includes('al-ifta.gov.sa')) return 'Source Religieuse (Institution)';
  if (hostname.includes('sunnah.com') || hostname.includes('hadithunlocked.com')) return 'Source Hadith / Sunna';
  if (hostname.includes('quran.com') || hostname.includes('altafsir.com')) return 'Source Coran / Exégèse (Tafsir)';
  if (hostname.includes('dorar.net') || hostname.includes('shamela.ws')) return 'Encyclopédie Islamique';
  if (hostname.includes('binbaz.org.sa') || hostname.includes('ibnothaimeen.net')) return 'Fatwas Savants Contemporains';
  if (hostname.includes('islamhouse.com') || hostname.includes('islamonline.net') || hostname.includes('as-salat.com')) return 'Portail Éducatif Islamique';
  
  if (hostname.includes('wikipedia.org')) return 'Source Encyclopédique / Académique';
  if (hostname.includes('cairn.info') || hostname.includes('persee.fr')) return 'Source Académique';
  if (hostname.includes('gallica.bnf.fr')) return 'Source Historique';
  if (hostname.includes('lescahiersdelislam.fr') || hostname.includes('imarabe.org')) return 'Études & Réflexions Islamiques';
  if (hostname.includes('larousse.fr') || hostname.includes('universalis.fr')) return 'Dictionnaire & Encyclopédie';
  if (hostname.includes('oumma.com') || hostname.includes('saphirnews.com') || hostname.includes('mizane.info') || hostname.includes('ajib.fr') || hostname.includes('katib.fr')) return 'Média & Culture Musulmane';
  
  return 'Source Documentaire Référencée';
}

export function isUrlAllowed(urlString: string, levelDomains: string[]): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    return levelDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fetchWithTimeout(url: string, timeout = 3500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { 
      signal: controller.signal, 
      headers: { 
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      } 
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Extract clean text from fetched HTML based on domain structure
function extractDomainContent(html: string, urlStr: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, .sidebar, .menu, .advertisement, iframe').remove();

  if (urlStr.includes('doctrine-malikite.fr')) {
    const entry = $('.entry-content').text().replace(/\s+/g, ' ').trim();
    if (entry.length > 200) return entry.substring(0, 4500);
  }

  if (urlStr.includes('islamqa.info')) {
    const fatwa = $('.single_fatwa__text').text().replace(/\s+/g, ' ').trim();
    if (fatwa.length > 200) return fatwa.substring(0, 4500);
  }

  const main = $('article, main, #content, .content, body').text().replace(/\s+/g, ' ').trim();
  return main.substring(0, 4000);
}

// Direct Wikipedia API search for encyclopedic/theological/historical concepts (Level 2)
async function searchWikipedia(query: string): Promise<SearchSource | null> {
  try {
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(searchUrl, { 
      headers: { 'User-Agent': 'CheikhIA-AcademicBot/1.0' } 
    });
    const data = await res.json();
    const hits = data.query?.search || [];
    if (hits.length === 0) return null;

    const topTitle = hits[0].title;
    const extractUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(topTitle)}&format=json`;
    const extRes = await fetch(extractUrl, { 
      headers: { 'User-Agent': 'CheikhIA-AcademicBot/1.0' } 
    });
    const extData = await extRes.json();
    const pages = extData.query?.pages || {};
    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId]?.extract || '';

    if (extract.length > 150) {
      return {
        id: 0,
        domain: 'fr.wikipedia.org',
        title: `${topTitle} — Wikipédia`,
        url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(topTitle)}`,
        content: extract.substring(0, 4000),
        sourceType: 'Source Encyclopédique / Académique'
      };
    }
  } catch (err) {
    console.warn('[SearchBroker] Wikipedia API query error:', err);
  }
  return null;
}

// Curated canonical references for core Islamic fiqh topics from verified domains
async function getCanonicalIslamicReferences(query: string): Promise<{ title: string; url: string }[]> {
  const q = query.toLowerCase();
  const refs: { title: string; url: string }[] = [];

  const isPrayer = q.includes('prière') || q.includes('priere') || q.includes('salat') || q.includes('salât');
  const isMalikite = q.includes('malik') || q.includes('mâlik');
  const isConditions = q.includes('condition') || q.includes('validité') || q.includes('valide') || q.includes('invalide') || q.includes('pilier') || q.includes('obligation');

  if (isPrayer && (isConditions || isMalikite)) {
    refs.push({
      title: "Les obligations, Sunanes et conditions de la prière selon Ibn 'Âshir (Doctrine Malikite)",
      url: "https://www.doctrine-malikite.fr/Matn-Ibn-ashir-as-salat_a69.html"
    });
    refs.push({
      title: "Ce qui rend la prière invalide (Mubtilât as-salât) - Doctrine Malikite",
      url: "https://www.doctrine-malikite.fr/Mubtilat-as-salat_a73.html"
    });
    refs.push({
      title: "Les conditions de validité de la prière - IslamQA (Fatwa 107701)",
      url: "https://islamqa.info/fr/answers/107701"
    });
  } else if (isMalikite) {
    refs.push({
      title: "L'Imâm Mâlik et les fondements de son école - Doctrine Malikite",
      url: "https://www.doctrine-malikite.fr/Doctrine-malikite_r113.html"
    });
    refs.push({
      title: "La doctrine malikite et ses sources - Doctrine Malikite",
      url: "https://www.doctrine-malikite.fr/La-doctrine-malikite_r22.html"
    });
  }

  // Abandon de la prière
  if (q.includes('abandon') && (q.includes('prière') || q.includes('priere') || q.includes('salat'))) {
    refs.push({
      title: "Le statut de celui qui délaisse la prière - IslamQA (Fatwa 2182)",
      url: "https://islamqa.info/fr/answers/2182"
    });
    refs.push({
      title: "Le jugement de celui qui néglige la prière par paresse - IslamQA (Fatwa 5208)",
      url: "https://islamqa.info/fr/answers/5208"
    });
  }

  // Lecture quotidienne du Coran / Mérites
  if (q.includes('coran') && (q.includes('obligatoire') || q.includes('tous les jours') || q.includes('chaque jour') || q.includes('commencer') || q.includes('mérite') || q.includes('merite'))) {
    refs.push({
      title: "Est-il obligatoire de lire le Coran tous les jours ? - IslamQA (Fatwa 224169)",
      url: "https://islamqa.info/fr/answers/224169"
    });
    refs.push({
      title: "Les mérites de la récitation et de la méditation du Coran - Doctrine Malikite",
      url: "https://www.doctrine-malikite.fr/Les-merites-du-Coran_a55.html"
    });
  }

  return refs;
}

// Execute DDG web search with broader domain coverage and fast timeout
async function executeSearchForDomains(query: string, domains: string[]): Promise<{title: string, url: string}[]> {
  try {
    const sitesQuery = domains.slice(0, 8).map(d => `site:${d}`).join(' OR ');
    const searchQuery = `${query} ${sitesQuery}`;
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    
    const searchRes = await fetchWithTimeout(searchUrl, 2500);
    if (!searchRes.ok) return [];
    const searchHtml = await searchRes.text();
    const $ = cheerio.load(searchHtml);
    
    const results: { title: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    $('.result__a').each((_, el) => {
      const title = $(el).text().trim();
      const rawUrl = $(el).attr('href');
      if (rawUrl && rawUrl.includes('uddg=')) {
        const urlParam = new URLSearchParams(rawUrl.split('?')[1]).get('uddg');
        if (urlParam) {
          const decodedUrl = decodeURIComponent(urlParam);
          if (!seenUrls.has(decodedUrl) && isUrlAllowed(decodedUrl, domains)) {
            seenUrls.add(decodedUrl);
            results.push({ title, url: decodedUrl });
          }
        }
      }
    });

    // Fallback: if restrictive site search returned nothing, broaden query
    if (results.length === 0) {
      const broadSearchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' islam')}`;
      const broadRes = await fetchWithTimeout(broadSearchUrl, 2500);
      if (broadRes.ok) {
        const broadHtml = await broadRes.text();
        const $b = cheerio.load(broadHtml);
        $b('.result__a').each((_, el) => {
          const title = $b(el).text().trim();
          const rawUrl = $b(el).attr('href');
          if (rawUrl && rawUrl.includes('uddg=')) {
            const urlParam = new URLSearchParams(rawUrl.split('?')[1]).get('uddg');
            if (urlParam) {
              const decodedUrl = decodeURIComponent(urlParam);
              if (!seenUrls.has(decodedUrl) && isUrlAllowed(decodedUrl, domains)) {
                seenUrls.add(decodedUrl);
                results.push({ title, url: decodedUrl });
              }
            }
          }
        });
      }
    }

    return results;
  } catch (e) {
    return [];
  }
}

// SEARCH BROKER: Multi-strategy Islamic & Academic Document Retrieval
export async function performIslamicSearch(query: string): Promise<SearchSource[]> {
  const lowerQuery = query.toLowerCase();
  const allDomains = [...LEVEL_1_DOMAINS, ...LEVEL_2_DOMAINS];
  const sources: SearchSource[] = [];
  const visitedUrls = new Set<string>();
  let currentId = 1;

  console.log(`[SearchBroker] Starting broadened multi-tiered search for: "${query}"`);

  // Search with overall max 3500ms safety timeout to prevent any freeze
  const searchPromise = (async () => {
    // 1. Conceptual/Historical/Prophets query -> Check Wikipedia REST API directly (Level 2)
    const isConceptual = lowerQuery.includes('coraniste') || lowerQuery.includes('coranisme') || 
      lowerQuery.includes('courant') || lowerQuery.includes('secte') || lowerQuery.includes('histoire') ||
      lowerQuery.includes('prophète') || lowerQuery.includes('prophete') || lowerQuery.includes('hadith') ||
      lowerQuery.includes('tafsir') || lowerQuery.includes('sourate') || lowerQuery.includes('verset') ||
      lowerQuery.includes('calife') || lowerQuery.includes('compagnon') || lowerQuery.includes('fiqh');

    if (isConceptual) {
      const wikiSearchTerm = lowerQuery.includes('coraniste') || lowerQuery.includes('coranisme') ? 'Coranisme' : query;
      const wikiSource = await searchWikipedia(wikiSearchTerm);
      if (wikiSource) {
        wikiSource.id = currentId++;
        visitedUrls.add(wikiSource.url);
        sources.push(wikiSource);
        console.log(`[SearchBroker] Wikipedia hit: ${wikiSource.title}`);
      }
    }

    // 2. Curated canonical Islamic sources for core fiqh topics (Level 1)
    const canonicalCandidates = await getCanonicalIslamicReferences(query);
    const candidateFetches = canonicalCandidates.slice(0, 3).map(async (candidate) => {
      if (visitedUrls.has(candidate.url)) return;
      try {
        const pageRes = await fetchWithTimeout(candidate.url, 2500);
        if (pageRes.ok) {
          const pageHtml = await pageRes.text();
          const content = extractDomainContent(pageHtml, candidate.url);
          if (content.length > 200 && !visitedUrls.has(candidate.url)) {
            visitedUrls.add(candidate.url);
            sources.push({
              id: currentId++,
              domain: new URL(candidate.url).hostname,
              title: candidate.title,
              url: candidate.url,
              content,
              sourceType: getDomainType(new URL(candidate.url).hostname)
            });
          }
        }
      } catch (e) {
        // Skip silently on timeout
      }
    });

    await Promise.allSettled(candidateFetches);

    // 3. Dynamic Web Search via DuckDuckGo with broadened domain scope
    if (sources.length < 3) {
      try {
        const cleanQuery = query
          .replace(/^(quelles sont|quels sont|quelle est|quel est|c'est quoi|qu'est ce que|qu'est-ce que|parle moi de|explique moi|selon|donne moi)/gi, '')
          .replace(/[?.,!;:]/g, '')
          .trim();

        const searchKeyword = cleanQuery.length > 3 ? cleanQuery : query;
        const targetDomains = lowerQuery.includes('malik') 
          ? ['doctrine-malikite.fr', 'islamweb.net', 'islamqa.info', 'dar-alifta.org', 'sunnisme.com'] 
          : ['islamqa.info', 'islamweb.net', 'doctrine-malikite.fr', 'sunnah.com', 'quran.com', 'dar-alifta.org', 'mahadsunnah.com'];

        const ddgResults = await executeSearchForDomains(searchKeyword, targetDomains);
        const scrapePromises = ddgResults.slice(0, 4).map(async (res) => {
          if (visitedUrls.has(res.url)) return;
          try {
            const pageRes = await fetchWithTimeout(res.url, 2500);
            if (pageRes.ok) {
              const pageHtml = await pageRes.text();
              const content = extractDomainContent(pageHtml, res.url);
              if (content.length > 200 && !visitedUrls.has(res.url)) {
                visitedUrls.add(res.url);
                sources.push({
                  id: currentId++,
                  domain: new URL(res.url).hostname,
                  title: res.title,
                  url: res.url,
                  content,
                  sourceType: getDomainType(new URL(res.url).hostname)
                });
              }
            }
          } catch (e) {
            // Skip
          }
        });

        await Promise.allSettled(scrapePromises);
      } catch (err) {
        console.warn('[SearchBroker] DDG dynamic search failed:', err);
      }
    }

    // 4. Complementary Wikipedia for prayer/salat if still below 2 sources
    if (sources.length < 2 && (lowerQuery.includes('priere') || lowerQuery.includes('prière') || lowerQuery.includes('salat'))) {
      const wikiPriere = await searchWikipedia('Salat (islam)');
      if (wikiPriere && !visitedUrls.has(wikiPriere.url)) {
        wikiPriere.id = currentId++;
        sources.push(wikiPriere);
      }
    }

    return sources;
  })();

  const timeoutPromise = new Promise<SearchSource[]>((resolve) => setTimeout(() => resolve(sources), 3500));
  return await Promise.race([searchPromise, timeoutPromise]);
}
