/**
 * UI Manipulation, Markdown Parsing, and Event Formatting for Identitification
 */

/**
 * Copies code block content to clipboard
 * @param {HTMLButtonElement} btn 
 * @param {string} codeText 
 */
function copyToClipboard(btn, codeText) {
  navigator.clipboard.writeText(codeText).then(() => {
    const origText = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    setTimeout(() => {
      btn.innerHTML = origText;
    }, 2000);
  }).catch(err => {
    console.error('Clipboard copy failed:', err);
  });
}

/**
 * Cleans HTML entities and extracts a pure URL excluding trailing brackets and punctuation.
 */
function extractUrl(content) {
  let clean = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const match = clean.match(/(https?:\/\/[^\s<>\(\)]+)/);
  if (match) {
    let url = match[1];
    url = url.replace(/[\.,;:!\]\?]+$/, '');
    return url;
  }
  return '';
}

/**
 * Dynamic bibliography parsing engine to extract citation meta directly from the model response text
 */
function parseBibliography(text, sources) {
  const bibliographyMap = {};
  
  if (text && !text.startsWith('HTML::')) {
    let escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const lines = escaped.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const sourceMatch = trimmed.match(/^(?:SOURCE\s*)?\[(\d+)\]\s*[:\-]?\s*(.*)$/i);
      
      if (sourceMatch) {
        const citationId = parseInt(sourceMatch[1], 10);
        let content = sourceMatch[2].trim();
        
        let url = extractUrl(content);
        
        let sourceName = '';
        let headline = '';
        
        let contentWithoutUrl = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (url) {
          contentWithoutUrl = contentWithoutUrl.replace(url, '').replace(/<>/g, '').trim();
        }
        
        const parts = contentWithoutUrl.split(/\s*[\u2014\u2013]|\s+-\s+|\s*\|\s*/);
        if (parts.length >= 2) {
          sourceName = parts[0].trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '');
          headline = parts[1].trim().replace(/^["']|["']$/g, '');
        }
        
        if (!sourceName || !headline) {
          if (url) {
            const meta = window.IdentitificationSearch.getUrlMetadataFallback(url);
            if (!sourceName) sourceName = meta.domain;
            if (!headline) headline = meta.title;
          }
        }
        
        if (url) {
          bibliographyMap[citationId] = {
            source: sourceName || 'Source',
            title: headline || 'Cited Link',
            url: url
          };
        }
      }
    }
  }
  
  if (Object.keys(bibliographyMap).length === 0 && sources && sources.length > 0) {
    sources.forEach((s, idx) => {
      bibliographyMap[idx + 1] = {
        source: s.source || 'Web',
        title: s.title || s.url,
        url: s.url
      };
    });
  }
  
  return bibliographyMap;
}

/**
 * Format markdown block and convert it to clean HTML structures.
 * Supports headings, custom bibliography, bullet points, numbering, tables, code blocks with copying.
 */
function formatArticleBody(text, sources) {
  if (text && text.startsWith('HTML::')) {
    return text.slice(6);
  }
  
  const bibliographyMap = parseBibliography(text, sources);
  
  let escaped = (text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  
  const lines = escaped.split('\n');
  let html = '';
  
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 1. Code Block Handler
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeBuffer.join('\n');
        const codeEscaped = codeText.replace(/"/g, '&quot;');
        
        html += `
          <div class="code-block-header">
            <span>${codeLang ? codeLang.toUpperCase() : 'CODE'}</span>
            <button class="copy-code-btn" onclick="this.dataset.code ? window.IdentitificationUI.copyToClipboard(this, this.dataset.code) : null" data-code="${codeEscaped}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Copy Code
            </button>
          </div>
          <pre><code>${codeText}</code></pre>
        `;
        inCodeBlock = false;
        codeBuffer = [];
      } else {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }
    
    // 2. Table Handler
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableHeaders = trimmed.split('|').slice(1, -1).map(h => h.trim());
        tableRows = [];
      } else {
        if (trimmed.replace(/[\s\-\|:]/g, '') === '') {
          continue;
        }
        const rowCells = line.split('|').slice(1, -1).map(c => c.trim());
        tableRows.push(rowCells);
      }
      continue;
    } else if (inTable) {
      html += `<table><thead><tr>`;
      tableHeaders.forEach(th => {
        html += `<th>${formatInlineMarkdown(th, bibliographyMap)}</th>`;
      });
      html += `</tr></thead><tbody>`;
      tableRows.forEach(row => {
        html += `<tr>`;
        row.forEach(cell => {
          html += `<td>${formatInlineMarkdown(cell, bibliographyMap)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table>`;
      inTable = false;
    }
    
    if (trimmed === '') {
      html += '<div style="height:10px"></div>';
      continue;
    }
    
    // 3. Custom Bibliography Source lines
    const sourceMatch = trimmed.match(/^(?:SOURCE\s*)?\[(\d+)\]\s*[:\-]?\s*(.*)$/i);
    if (sourceMatch) {
      const citationId = parseInt(sourceMatch[1], 10);
      const src = bibliographyMap[citationId];
      if (src) {
        let htmlOutput = `<span style="color:var(--accent-cyan);font-weight:600;">Source [${citationId}]:</span> `;
        if (src.source) htmlOutput += `<span style="font-weight:600;color:var(--text);">${src.source}</span>`;
        if (src.title) htmlOutput += ` — <span style="font-style:italic;color:var(--text-dim);">"${src.title}"</span>`;
        htmlOutput += ` — <a href="${src.url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-cyan);text-decoration:underline;word-break:break-all;">${src.url}</a>`;
        
        html += `<div class="source-citation-line" style="font-size:0.78rem;color:var(--text-dim);margin-top:4px;font-family:var(--mono);">${htmlOutput}</div>`;
      }
      continue;
    }
    
    // 4. Headers formatting
    const headerMatch = trimmed.match(/^(?:&lt;strong[^&gt;]*&gt;)?(KEY POINTS|SUMMARY|CONCLUSION|NOTE|WARNING|ANALYSIS|BRIEFING|OVERVIEW|FINDINGS|RECOMMENDATION):?(?:&lt;\/strong&gt;)?:\s*(.*)$/i);
    if (headerMatch) {
      const label = headerMatch[1].toUpperCase();
      const rest = headerMatch[2];
      html += `<div class="section-hdr">${label}</div>` + (rest ? `<p>${formatInlineMarkdown(rest, bibliographyMap)}</p>` : '');
      continue;
    }
    
    // 5. Bullet points list
    const bulletMatch = trimmed.match(/^[•\-]\s+(.+)$/);
    if (bulletMatch) {
      html += `<div class="article-bullet"><span class="bullet-marker">&bull;</span><span class="bullet-content">${formatInlineMarkdown(bulletMatch[1], bibliographyMap)}</span></div>`;
      continue;
    }
    
    // 6. Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      html += `<div class="article-num-list"><span class="num-marker">${numMatch[1]}.</span><span class="num-content">${formatInlineMarkdown(numMatch[2], bibliographyMap)}</span></div>`;
      continue;
    }
    
    html += `<p>${formatInlineMarkdown(line, bibliographyMap)}</p>`;
  }
  
  return html;
}

/**
 * Formats inline bold, italic, code tags, and citation tooltip links
 */
function formatInlineMarkdown(text, bibliographyMap) {
  let res = text;
  
  res = res.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:var(--text);">$1</strong>');
  res = res.replace(/\*(.+?)\*/g, '<em style="color:var(--text-dim);">$1</em>');
  res = res.replace(/`([^`]+)`/g, '<code style="font-family:var(--mono);font-size:.82rem;background:rgba(255,255,255,0.04);padding:2px 5px;border-radius:4px;color:var(--accent-cyan);border:1px solid var(--border);">$1</code>');

  res = res.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, p1, p2) => {
    const cleanUrl = p2.replace(/&amp;/g, '&');
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-cyan); text-decoration: underline; font-weight: 600;">${p1}</a>`;
  });

  res = res.replace(/\[(\d+)\]/g, (match, numStr) => {
    const idx = parseInt(numStr, 10);
    const src = bibliographyMap && bibliographyMap[idx];
    if (src && src.url) {
      const cleanUrl = src.url.replace(/"/g, '&quot;');
      const cleanTitle = src.title.replace(/"/g, '&quot;');
      const cleanSource = src.source.replace(/"/g, '&quot;');
      return `<a href="${src.url}" target="_blank" rel="noopener noreferrer" class="citation-sup" data-url="${cleanUrl}" data-title="${cleanTitle}" data-source="${cleanSource}">[${numStr}]</a>`;
    }
    return `<sup class="citation-sup">[${numStr}]</sup>`;
  });

  return res;
}

/**
 * Configures event delegation for hover-card citation tooltips on messages container
 */
function setupCitationTooltips(msgsEl) {
  let activeTooltip = null;

  msgsEl.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.citation-sup');
    if (!target) return;
    
    const url = target.getAttribute('data-url');
    const title = target.getAttribute('data-title');
    const source = target.getAttribute('data-source');
    if (!url) return;

    if (activeTooltip) activeTooltip.remove();

    activeTooltip = document.createElement('div');
    activeTooltip.className = 'citation-tooltip';
    activeTooltip.innerHTML = `
      <div class="tooltip-domain">${source}</div>
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 0.65rem; color: var(--text-muted); word-break: break-all;">${url}</div>
    `;

    document.body.appendChild(activeTooltip);

    const rect = target.getBoundingClientRect();
    const tooltipHeight = activeTooltip.offsetHeight;
    const tooltipWidth = activeTooltip.offsetWidth;
    
    // Position above the superscript badge, centered
    let top = rect.top + window.scrollY - tooltipHeight - 8;
    let left = rect.left + window.scrollX + (rect.width / 2) - (tooltipWidth / 2);

    if (top < 10) {
      // Position below if it goes off screen
      top = rect.bottom + window.scrollY + 8;
    }
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    activeTooltip.style.top = top + 'px';
    activeTooltip.style.left = left + 'px';
  });

  msgsEl.addEventListener('mouseout', (e) => {
    const target = e.target.closest('.citation-sup');
    if (!target) return;
    
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  });
}

/**
 * Creates visual cards for chat bubbles
 */
function addBubble(side, text, sources, saveToHistory, state, now, renderHistoryList) {
  const msgsEl = document.getElementById('msgs');
  if (!msgsEl) return;

  if (saveToHistory) {
    const role = (side === 'aria' ? 'assistant' : 'user');
    
    if (state.incognitoActive) {
      state.incognitoConversation.history.push({ role, content: text, sources });
      if (state.incognitoConversation.history.length > 25) {
        state.incognitoConversation.history.splice(0, state.incognitoConversation.history.length - 25);
      }
    } else if (state.activeConversation) {
      state.activeConversation.history.push({ role, content: text, sources });
      if (state.activeConversation.history.length > 25) {
        state.activeConversation.history.splice(0, state.activeConversation.history.length - 25);
      }
      
      if (side === 'boss') {
        const cleanText = text.replace(/\[LIVE_DATA\][\s\S]*?\[\/LIVE_DATA\]/, '').trim();
        state.activeConversation.title = cleanText.slice(0, 30) + (cleanText.length > 30 ? '…' : '');
        renderHistoryList();
      }
      
      localStorage.setItem(`identitification_conversations_${state.activeProfile}`, JSON.stringify(state.conversations));
    }
  }

  const row = document.createElement('div');
  row.className = 'row ' + side;

  if (side === 'boss') {
    let pfpHtml = '';
    const initial = state.activeUsername ? state.activeUsername.charAt(0).toUpperCase() : 'B';
    const activeUserObj = (state.userDb || []).find(u => u.email === state.activeProfile);
    
    if (activeUserObj && activeUserObj.pfp) {
      pfpHtml = `<img src="${activeUserObj.pfp}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      pfpHtml = `<div style="width: 100%; height: 100%; border-radius: 50%; background: var(--accent-gradient); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">${initial}</div>`;
    }

    const senderName = state.activeUsername || 'Boss';

    row.innerHTML = `
      <div class="bub-wrap">
        <div class="sender">${senderName}</div>
        <div class="bub boss"></div>
        <div class="ts">${now()}</div>
      </div>
      <div class="mini-av" style="background: none; border: none; box-shadow: none;">
        ${pfpHtml}
      </div>
    `;
    row.querySelector('.bub.boss').textContent = text;
  } else {
    const aiSvg = `
      <svg viewBox="0 0 100 100" style="width: 20px; height: 20px; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
        <path d="M 18 36 C 25 22, 50 18, 68 28 C 85 38, 90 60, 80 75 C 70 90, 48 90, 42 78 C 36 66, 48 55, 58 60 C 66 64, 68 74, 60 76 C 56 77, 54 73, 56 70 C 58 67, 62 68, 61 71" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" />
        <path d="M 30 25 C 38 18, 52 18, 64 24" fill="none" stroke="var(--accent-cyan)" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 6" />
        <path d="M 18 36 C 14 44, 18 56, 28 62 C 38 68, 48 64, 48 64" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" />
        <circle cx="28" cy="46" r="10" fill="none" stroke="var(--accent)" stroke-width="4" />
        <circle cx="28" cy="46" r="4" fill="#ffffff" />
      </svg>
    `;
    
    row.innerHTML = `
      <div class="mini-av">
        ${aiSvg}
      </div>
      <div class="bub-wrap">
        <div class="sender">${state.activeCharacter.name}</div>
        <div class="bub aria"></div>
        <div class="ts">${now()}</div>
      </div>
    `;
    row.querySelector('.bub.aria').innerHTML = formatArticleBody(text, sources);
    
    // Add custom bibliography block aligned with parsed response bibliography
    const bibliographyMap = parseBibliography(text, sources);
    const citedKeys = Object.keys(bibliographyMap).map(Number).sort((a, b) => a - b);
    
    if (citedKeys.length > 0) {
      const footnoteDiv = document.createElement('div');
      footnoteDiv.className = 'sources';
      
      const fTitle = document.createElement('div');
      fTitle.className = 'sources-label';
      fTitle.textContent = 'Sources Bibliography';
      footnoteDiv.appendChild(fTitle);
      
      const grid = document.createElement('div');
      grid.className = 'sources-grid';
      
      citedKeys.forEach((key) => {
        const s = bibliographyMap[key];
        const item = document.createElement('div');
        item.className = 'source-item';
        
        const num = document.createElement('span');
        num.className = 'src-num';
        num.textContent = `[${key}]`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'src-content';
        
        const link = document.createElement('a');
        link.className = 'src-link';
        link.href = s.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = s.title || s.source || s.url;
        
        const sMeta = document.createElement('span');
        sMeta.className = 'src-meta';
        
        let displayUrl = s.url;
        try {
          displayUrl = new URL(s.url).hostname;
        } catch(e) {}
        sMeta.textContent = s.title ? `${s.source} — ${displayUrl}` : s.url;
        
        contentDiv.appendChild(link);
        contentDiv.appendChild(sMeta);
        item.appendChild(num);
        item.appendChild(contentDiv);
        grid.appendChild(item);
      });
      
      footnoteDiv.appendChild(grid);
      row.querySelector('.bub-wrap').insertBefore(footnoteDiv, row.querySelector('.ts'));
    }
  }

  msgsEl.appendChild(row);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

/**
 * Toggles progress scan tracker card
 */
function showResearchCard() {
  removeResearchCard();
  const msgsEl = document.getElementById('msgs');
  if (!msgsEl) return;
  
  const progressDiv = document.createElement('div');
  progressDiv.id = 'live-research-card';
  progressDiv.className = 'progress-card';
  
  progressDiv.innerHTML = `
    <div class="progress-hdr">
      <span>Scanning Intelligence Databases</span>
      <span class="status-indicator"></span>
    </div>
    <div class="progress-steps">
      <div class="progress-step" id="step-ddg">
        <span class="step-icon">⬡</span> <span class="step-text">DuckDuckGo Web Search</span>
      </div>
      <div class="progress-step" id="step-rss">
        <span class="step-icon">⬡</span> <span class="step-text">RSS News Feeds</span>
      </div>
      <div class="progress-step" id="step-wiki">
        <span class="step-icon">⬡</span> <span class="step-text">Wikipedia Encyclopedia</span>
      </div>
    </div>
  `;
  msgsEl.appendChild(progressDiv);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

/**
 * Updates individual scanner card steps
 */
function updateResearchStep(stepId, text, status) {
  const step = document.getElementById('step-' + stepId);
  if (!step) return;
  
  const iconEl = step.querySelector('.step-icon');
  const textEl = step.querySelector('.step-text');
  
  if (textEl) textEl.textContent = text;
  step.className = 'progress-step ' + status;
  
  if (iconEl) {
    if (status === 'running') {
      iconEl.textContent = '⬡';
    } else if (status === 'done') {
      iconEl.textContent = '✓';
    } else {
      iconEl.textContent = '⬡';
    }
  }
}

/**
 * Adds scraper step to scanner progress card dynamically
 */
function addResearchStep(stepId, text, status) {
  const card = document.getElementById('live-research-card');
  if (!card) return;
  const container = card.querySelector('.progress-steps');
  if (!container) return;
  
  let step = document.getElementById('step-' + stepId);
  if (!step) {
    step = document.createElement('div');
    step.id = 'step-' + stepId;
    step.className = 'progress-step ' + status;
    step.innerHTML = `<span class="step-icon">⬡</span> <span class="step-text">${text}</span>`;
    container.appendChild(step);
    
    const msgsEl = document.getElementById('msgs');
    if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
  } else {
    updateResearchStep(stepId, text, status);
  }
}

function removeResearchCard() {
  document.getElementById('live-research-card')?.remove();
}

/**
 * Renders typing indicator row
 */
function showTyping(characterName) {
  killTyping();
  const msgsEl = document.getElementById('msgs');
  if (!msgsEl) return;
  
  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing';
  typingDiv.className = 'row aria';
  
  const aiSvg = `
    <svg viewBox="0 0 100 100" style="width: 20px; height: 20px; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
      <path d="M 18 36 C 25 22, 50 18, 68 28 C 85 38, 90 60, 80 75 C 70 90, 48 90, 42 78 C 36 66, 48 55, 58 60 C 66 64, 68 74, 60 76 C 56 77, 54 73, 56 70 C 58 67, 62 68, 61 71" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" />
      <path d="M 30 25 C 38 18, 52 18, 64 24" fill="none" stroke="var(--accent-cyan)" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 6" />
      <path d="M 18 36 C 14 44, 18 56, 28 62 C 38 68, 48 64, 48 64" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" />
      <circle cx="28" cy="46" r="10" fill="none" stroke="var(--accent)" stroke-width="4" />
      <circle cx="28" cy="46" r="4" fill="#ffffff" />
    </svg>
  `;
  
  typingDiv.innerHTML = `
    <div class="mini-av">
      ${aiSvg}
    </div>
    <div class="bub-wrap">
      <div class="sender">${characterName}</div>
      <div class="bub aria">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  msgsEl.appendChild(typingDiv);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function killTyping() {
  document.getElementById('typing')?.remove();
}

function toggleSettingsMethod(method) {
  const onlineSec = document.getElementById('sec-online');
  const offlineSec = document.getElementById('sec-offline');
  const apikeySec = document.getElementById('sec-apikey');
  
  if (onlineSec) onlineSec.style.display = method === 'online' ? 'block' : 'none';
  if (offlineSec) offlineSec.style.display = method === 'offline' ? 'block' : 'none';
  if (apikeySec) apikeySec.style.display = method === 'apikey' ? 'block' : 'none';
}

/**
 * Manage and display Modal forms
 */
function openModal(id, state, tempPfpSetter) {
  const modal = document.getElementById(id);
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  if (id === 'settings-modal' && state.settings) {
    const config = state.settings;
    const methodSelect = document.getElementById('settings-method');
    if (methodSelect) {
      methodSelect.value = config.method || 'online';
      toggleSettingsMethod(config.method || 'online');
    }
    
    const onlineModelSelect = document.getElementById('settings-online-model');
    if (onlineModelSelect) {
      onlineModelSelect.value = config.onlineModel || 'meta-llama/llama-3.3-70b-instruct:free';
    }
    document.getElementById('settings-local-url').value = config.localUrl || 'http://localhost:11434/v1/chat/completions';
    document.getElementById('settings-local-model').value = config.localModel || 'deepseek-r1';
    document.getElementById('settings-custom-key').value = config.customKey || '';
    document.getElementById('settings-custom-model').value = config.customModel || 'meta-llama/llama-3.3-70b-instruct:free';
  } else if (id === 'profile-modal') {
    const activeUser = (state.userDb || []).find(u => u.email === state.activeProfile) || { username: state.activeUsername, pfp: '' };
    document.getElementById('profile-settings-username').value = activeUser.username;
    
    const fileInput = document.getElementById('profile-settings-pfp-file');
    if (fileInput) fileInput.value = '';
    
    tempPfpSetter(activeUser.pfp || '');
    
    const previewEl = document.getElementById('profile-pfp-preview');
    const statusEl = document.getElementById('profile-pfp-preview-status');
    if (previewEl) {
      if (activeUser.pfp) {
        previewEl.innerHTML = `<img src="${activeUser.pfp}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        const initial = activeUser.username ? activeUser.username.charAt(0).toUpperCase() : 'G';
        previewEl.innerHTML = initial;
      }
    }
    if (statusEl) {
      statusEl.textContent = 'Active profile photo';
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function selectModelSlot(element) {
  const slots = document.querySelectorAll('.model-slot');
  slots.forEach(slot => slot.classList.remove('active'));
  element.classList.add('active');
  
  const modelValue = element.getAttribute('data-model');
  document.getElementById('settings-model').value = modelValue;
}

// Bind globally for code copying triggers
window.IdentitificationUI = {
  copyToClipboard,
  formatArticleBody,
  setupCitationTooltips,
  addBubble,
  showResearchCard,
  updateResearchStep,
  addResearchStep,
  removeResearchCard,
  showTyping,
  killTyping,
  openModal,
  closeModal,
  toggleSettingsMethod
};
