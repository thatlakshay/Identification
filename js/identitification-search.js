/**
 * Search and Web Scraping Engine for Identitification
 */

/**
 * Clean up text content and get domain name fallback from URL
 * @param {string} urlStr 
 */
function getUrlMetadataFallback(urlStr) {
  let domain = '';
  let title = '';
  try {
    const url = new URL(urlStr);
    domain = url.hostname.replace(/^www\./, '');
    
    domain = domain.split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('.');
      
    const pathParts = url.pathname.split('/').filter(p => p.length > 0);
    if (pathParts.length > 0) {
      let lastPart = pathParts[pathParts.length - 1];
      lastPart = lastPart.replace(/\.[a-zA-Z0-9]+$/, '');
      
      let cleanTitle = lastPart.replace(/[-_]+/g, ' ').trim();
      
      const isDigitOnly = /^\d+$/.test(cleanTitle);
      const isTooShort = cleanTitle.length < 4;
      const isAlphanumericCode = !cleanTitle.includes(' ') && /(?=.*\d)(?=.*[a-zA-Z])/.test(cleanTitle);
      const GENERIC_SEGMENTS = ['index', 'watch', 'page', 'post', 'feed', 'article', 'home', 'default', 'main'];
      const isGeneric = GENERIC_SEGMENTS.includes(cleanTitle.toLowerCase());
      
      if (cleanTitle.length > 0 && !isDigitOnly && !isTooShort && !isAlphanumericCode && !isGeneric) {
        title = cleanTitle.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  } catch (e) {}
  return { domain, title };
}

/**
 * Accesses official CORS-enabled DuckDuckGo API for keyless fallback search
 */
async function duckInstantAnswer(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    
    // Abstract
    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        text: data.AbstractText,
        source: data.AbstractSource || 'Wikipedia Abstract'
      });
    }
    
    // Related
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
            url: topic.FirstURL,
            text: topic.Text,
            source: 'DuckDuckGo Topic'
          });
        } else if (topic.Topics) {
          topic.Topics.forEach(subTopic => {
            if (subTopic.Text && subTopic.FirstURL) {
              results.push({
                title: subTopic.Text.split(' - ')[0] || subTopic.Text.slice(0, 50),
                url: subTopic.FirstURL,
                text: subTopic.Text,
                source: 'DuckDuckGo Topic'
              });
            }
          });
        }
      });
    }
    
    return results.slice(0, 8);
  } catch (err) {
    console.error('duckInstantAnswer error:', err);
    return [];
  }
}

/**
 * Searches DuckDuckGo (HTML static engine) using CORS proxies with Instant Answer API fallbacks
 * @param {string} query 
 * @returns {Promise<Array>} List of search results
 */
async function duckSearch(query) {
  let results = [];
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    let html = '';
    
    try {
      const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(searchUrl), {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) html = await res.text();
    } catch (e) {}

    if (!html) {
      try {
        const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(searchUrl), {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const json = await res.json();
          html = json.contents || '';
        }
      } catch (e) {}
    }

    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      doc.querySelectorAll('.result').forEach(resultEl => {
        const aEl = resultEl.querySelector('.result__a');
        const snippetEl = resultEl.querySelector('.result__snippet');
        if (aEl) {
          const title = aEl.textContent.trim();
          let rawLink = aEl.getAttribute('href');
          
          if (rawLink) {
            if (rawLink.startsWith('//')) {
              rawLink = 'https:' + rawLink;
            }
            try {
              const urlObj = new URL(rawLink);
              const uddg = urlObj.searchParams.get('uddg');
              if (uddg) {
                rawLink = uddg;
              }
            } catch (err) {}
          }
          
          const snippet = snippetEl ? snippetEl.textContent.trim() : '';
          if (title && rawLink && rawLink.startsWith('http')) {
            results.push({
              title: title,
              url: rawLink,
              text: snippet
            });
          }
        }
      });
    }
  } catch (err) {
    console.error('duckSearch HTML scraping error:', err);
  }
  
  if (results.length === 0) {
    console.log("HTML search returned 0 results, attempting fallback Instant Answer API...");
    results = await duckInstantAnswer(query);
  }
  
  return results.slice(0, 8);
}

/**
 * Helper to fetch and parse individual RSS Feeds using a robust proxy fallback chain
 */
async function fetchAndParseRSS(feed) {
  let xmlText = '';
  
  // Try Proxy 1: corsproxy.io
  try {
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(feed.url);
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) xmlText = await res.text();
  } catch (e) {}
  
  // Try Proxy 2: codetabs
  if (!xmlText) {
    try {
      const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(feed.url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) xmlText = await res.text();
    } catch (e) {}
  }
  
  // Try Proxy 3: allorigins
  if (!xmlText) {
    try {
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(feed.url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        xmlText = json.contents || '';
      }
    } catch (e) {}
  }
  
  if (!xmlText) return [];
  
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const items = xmlDoc.querySelectorAll('item');
    
    const matched = [];
    items.forEach(item => {
      let title = item.querySelector('title')?.textContent || '';
      const desc = (item.querySelector('description')?.textContent || '').replace(/<[^>]+>/g,'').slice(0, 220);
      const link = item.querySelector('link')?.textContent || '';
      
      let sourceName = feed.name;
      const sourceEl = item.querySelector('source');
      if (sourceEl) {
        sourceName = sourceEl.textContent.trim() || sourceName;
      } else {
        const parts = title.split(' - ');
        if (parts.length > 1) {
          sourceName = parts.pop().trim();
          title = parts.join(' - ').trim();
        }
      }
      
      matched.push({ title, desc, url: link, source: sourceName });
    });
    return matched;
  } catch (e) {
    console.error('Error parsing RSS XML:', feed.name, e);
    return [];
  }
}

/**
 * Searches RSS Feeds (Google News Index + custom feeds)
 * @param {string} query 
 * @returns {Promise<Array>} Matching items
 */
async function fetchRSS(query) {
  const FEEDS = [
    { url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`, name: 'Google News Index' },
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',  name: 'BBC News World' },
    { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' }
  ];

  const q = query.toLowerCase().split(' ').filter(w => w.length > 3);
  
  const fetchPromises = FEEDS.map(async (feed) => {
    const matched = await fetchAndParseRSS(feed);
    if (feed.name !== 'Google News Index') {
      return matched.filter(item => q.some(w => item.title.toLowerCase().includes(w) || item.desc.toLowerCase().includes(w)));
    }
    return matched;
  });

  const resultsArray = await Promise.all(fetchPromises);
  const items = [];
  resultsArray.forEach(arr => {
    items.push(...arr);
  });

  // Deduplicate items by title
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const cleanTitle = item.title.toLowerCase().trim();
    if (!seen.has(cleanTitle)) {
      seen.add(cleanTitle);
      deduped.push(item);
    }
  }

  return deduped.slice(0, 10);
}

/**
 * Searches Wikipedia using its Search API first, falling back to the summary endpoint
 * @param {string} query 
 */
async function wikiSearch(query) {
  try {
    // 1. Search Wikipedia for matching article title
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const searchResults = searchData?.query?.search;
    
    if (!searchResults || searchResults.length === 0) return null;
    
    // Take the best matching page title
    const bestTitle = searchResults[0].title;
    
    // 2. Fetch summary for the best matching title
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
    const res = await fetch(summaryUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.extract) {
      return { 
        text: data.extract.slice(0, 2000), 
        url: data.content_urls?.desktop?.page || 'https://wikipedia.org', 
        title: data.title 
      };
    }
    return null;
  } catch (e) {
    console.error('wikiSearch error:', e);
    return null;
  }
}

/**
 * Cleans fetched HTML and extracts main text paragraphs
 * @param {string} html 
 */
function parseHtmlText(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    doc.querySelectorAll('script, style, head, nav, footer, iframe, noscript, header, svg, aside, hr, button, input, form, link').forEach(el => el.remove());
    
    const paragraphs = doc.querySelectorAll('p');
    let pTexts = [];
    if (paragraphs.length > 0) {
      paragraphs.forEach(p => {
        const t = p.textContent.trim().replace(/\s+/g, ' ');
        if (t.length > 40) {
          pTexts.push(t);
        }
      });
    }
    
    let text = pTexts.join('\n\n');
    if (text.length < 200) {
      let divTexts = [];
      doc.querySelectorAll('div').forEach(div => {
        if (div.children.length === 0) {
          const t = div.textContent.trim().replace(/\s+/g, ' ');
          if (t.length > 50 && t.length < 1000) {
            divTexts.push(t);
          }
        }
      });
      text = divTexts.slice(0, 15).join('\n\n');
    }
    
    return text.slice(0, 2500);
  } catch (e) {
    return null;
  }
}

/**
 * Scrapes page content by cycling through different proxy endpoints
 * @param {string} url 
 */
async function fetchPageText(url) {
  // Proxy 1: corsproxy.io
  try {
    const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url), {
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const text = parseHtmlText(await res.text());
      if (text && text.length > 200) return text;
    }
  } catch (e) {}

  // Proxy 2: codetabs proxy
  try {
    const res = await fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url), {
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const text = parseHtmlText(await res.text());
      if (text && text.length > 200) return text;
    }
  } catch (e) {}

  // Proxy 3: allorigins win
  try {
    const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url), {
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.contents) {
        const text = parseHtmlText(json.contents);
        if (text && text.length > 200) return text;
      }
    }
  } catch (e) {}
  
  return null;
}

/**
 * Central Orchestrator for deep search intelligence gathering
 * @param {string} query User query
 * @param {boolean} deepSearchActive
 * @param {function} addStep Callback to render visual scanning card steps
 * @param {function} updateStep Callback to mark step completed
 * @param {function} removeCard Callback to destroy scanning card
 */
async function gatherIntel(query, deepSearchActive, addStep, updateStep, removeCard) {
  if (!deepSearchActive) {
    return { contextBlock: '', sources: [] };
  }

  addStep('ddg', 'DuckDuckGo Web Search', 'running');
  addStep('rss', 'RSS News Feeds', 'running');
  addStep('wiki', 'Wikipedia Encyclopedia', 'running');
  
  const promises = [];
  
  let pDdg = duckSearch(query).then(res => {
    updateStep('ddg', res.length > 0 ? `DuckDuckGo: Found ${res.length} references` : 'DuckDuckGo: No indexes found', 'done');
    return res;
  });
  promises.push(pDdg);
  
  let pRss = fetchRSS(query).then(res => {
    updateStep('rss', res.length > 0 ? `RSS Feeds: Compiled ${res.length} matches` : 'RSS Feeds: No matches', 'done');
    return res;
  });
  promises.push(pRss);
  
  let pWiki = wikiSearch(query).then(res => {
    updateStep('wiki', res ? `Wikipedia: Loaded article "${res.title}"` : 'Wikipedia: No matching records', 'done');
    return res;
  });
  promises.push(pWiki);
  
  await Promise.all(promises);
  
  const ddgItems = await pDdg;
  const rssItems = await pRss;
  const wiki = await pWiki;
  
  const seenUrls = new Set();
  const uniqueItems = [];

  if (wiki) {
    seenUrls.add(wiki.url);
  }

  ddgItems.forEach(item => {
    const cleanUrl = item.url.replace(/&amp;/g, '&');
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      uniqueItems.push({
        title: item.title,
        url: cleanUrl,
        source: item.source || getUrlMetadataFallback(cleanUrl).domain || 'Web Search',
        desc: item.text
      });
    }
  });

  rssItems.forEach(item => {
    const cleanUrl = item.url.replace(/&amp;/g, '&');
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      uniqueItems.push({
        title: item.title,
        url: cleanUrl,
        source: item.source,
        desc: item.desc
      });
    }
  });

  const scrapeTargets = uniqueItems.slice(0, 3);
  const scrapePromises = scrapeTargets.map(async (target, idx) => {
    const stepId = `scrape-${idx}`;
    const cleanUrl = target.url;
    const shortTitle = target.title.slice(0, 30) + (target.title.length > 30 ? '…' : '');
    const domain = target.source || 'Web';
    
    addStep(stepId, `Reading "${shortTitle}" (${domain})...`, 'running');
    
    const fullText = await fetchPageText(cleanUrl);
    if (fullText && fullText.length > 200) {
      updateStep(stepId, `Read: "${shortTitle}" (${domain})`, 'done');
      return { ...target, fullText: fullText };
    } else {
      updateStep(stepId, `Failed to read: "${shortTitle}"`, 'done');
      return { ...target, fullText: null };
    }
  });

  const scrapedResults = await Promise.all(scrapePromises);
  
  await new Promise(r => setTimeout(r, 600));
  removeCard();

  const allSources = [];
  let contextBlock = '';
  let sourceIndex = 1;
  
  if (wiki) {
    allSources.push({ title: wiki.title, url: wiki.url, source: 'Wikipedia' });
    contextBlock += `ENCYCLOPEDIA CONTEXT:\n[${sourceIndex}] Wikipedia — ${wiki.title} (${wiki.url}):\n${wiki.text}\n\n`;
    sourceIndex++;
  }
  
  if (scrapedResults.length > 0) {
    contextBlock += 'LATEST RESEARCH & WEB ARTICLES:\n';
    scrapedResults.forEach(res => {
      allSources.push({ title: res.title, url: res.url, source: res.source });
      const content = res.fullText || res.desc || 'No content available';
      contextBlock += `[${sourceIndex}] ${res.source} — ${res.title} (${res.url}):\n${content}\n\n`;
      sourceIndex++;
    });
  }

  return { contextBlock: contextBlock.trim(), sources: allSources };
}

// Expose utilities globally
window.IdentitificationSearch = {
  getUrlMetadataFallback,
  duckSearch,
  fetchRSS,
  wikiSearch,
  parseHtmlText,
  fetchPageText,
  gatherIntel
};
