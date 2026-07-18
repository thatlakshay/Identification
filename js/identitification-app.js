/**
 * Identitification — Main Application Bootstrapper & State Manager
 */

// --- Global state definition ---
const state = {
  activeProfile: localStorage.getItem('identitification_active_profile') || null,
  activeUsername: localStorage.getItem('identitification_active_username') || '',
  userDb: [],
  settings: null,
  characters: [],
  activeCharId: 'identitification',
  activeCharacter: null,
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  deepSearchActive: false,
  deepThinkActive: false,
  incognitoActive: false,
  incognitoConversation: null
};

const DEFAULT_CHARACTERS = [
  {
    id: 'identitification',
    name: 'IDENTITIFICATION',
    subtitle: 'Conversational Companion & Research Intel',
    systemPrompt: `You are IDENTITIFICATION, a highly conversational, supportive, and intelligent AI companion.
Your main priority is to talk to people properly, naturally, and warmly.

CONVERSATIONAL GUIDELINES:
- Natural & Warm: Speak naturally and build rapport. Empathize with the user, use clear language, and avoid rigid formatting or robotic jargon unless requested.
- Search Integration: When search context is provided under [LIVE_DATA], analyze it carefully. Only state facts directly supported by the sources.
- Citations: Cite your sources inline using [1], [2] next to the facts you cite.
- Bibliography: At the end of your response, list the sources you cited under a "Sources Bibliography" header.`
  }
];

const defaultSettings = {
  method: 'online',
  apiUrl: 'https://api.llm7.io/v1/chat/completions',
  model: 'meta-llama/llama-3.3-70b-instruct:free',
  apiKey: 'unused',
  onlineModel: 'meta-llama/llama-3.3-70b-instruct:free',
  localUrl: 'http://localhost:11434/v1/chat/completions',
  localModel: 'deepseek-r1',
  customKey: '',
  customModel: 'meta-llama/llama-3.3-70b-instruct:free'
};

// --- Time and Clock Utilities ---
function now() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' UTC+' + (-(new Date().getTimezoneOffset() / 60));
}

// --- App Bootstrap / Load state from storage ---
function loadProfileData() {
  if (!state.activeProfile) return;
  
  const avatarChar = document.getElementById('profile-avatar-char');
  const displayName = document.getElementById('profile-display-name');
  
  try {
    state.userDb = JSON.parse(localStorage.getItem('identitification_user_db')) || [];
  } catch (err) {
    state.userDb = [];
  }
  
  const currentUser = state.userDb.find(u => u.email === state.activeProfile) || { username: state.activeUsername };
  
  if (displayName) displayName.textContent = currentUser.username;
  if (avatarChar) {
    if (currentUser.pfp) {
      avatarChar.innerHTML = `<img src="${currentUser.pfp}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      avatarChar.style.background = 'none';
    } else {
      avatarChar.textContent = currentUser.username.charAt(0).toUpperCase();
      avatarChar.style.background = 'var(--accent-gradient)';
    }
  }
  
  state.settings = JSON.parse(localStorage.getItem(`identitification_settings_${state.activeProfile}`)) || { ...defaultSettings };
  state.characters = JSON.parse(localStorage.getItem(`identitification_characters_${state.activeProfile}`)) || [];
  
  const identitificationIndex = state.characters.findIndex(c => c.id === 'identitification');
  if (identitificationIndex !== -1) {
    state.characters[identitificationIndex].systemPrompt = DEFAULT_CHARACTERS[0].systemPrompt;
    state.characters[identitificationIndex].subtitle = DEFAULT_CHARACTERS[0].subtitle;
  } else {
    state.characters.unshift(DEFAULT_CHARACTERS[0]);
  }
  localStorage.setItem(`identitification_characters_${state.activeProfile}`, JSON.stringify(state.characters));
  
  state.activeCharId = localStorage.getItem(`identitification_active_char_id_${state.activeProfile}`) || 'identitification';
  state.activeCharacter = state.characters.find(c => c.id === state.activeCharId) || state.characters[0];
  
  state.conversations = JSON.parse(localStorage.getItem(`identitification_conversations_${state.activeProfile}`)) || [];
  state.activeConversationId = localStorage.getItem(`identitification_active_conv_id_${state.activeProfile}`) || null;
  state.activeConversation = state.conversations.find(c => c.id === state.activeConversationId);
  
  if (!state.activeConversation) {
    if (state.conversations.length > 0) {
      state.activeConversation = state.conversations[0];
      state.activeConversationId = state.activeConversation.id;
    } else {
      state.activeConversation = {
        id: 'chat-' + Date.now(),
        title: 'New Session',
        characterId: state.activeCharId,
        history: []
      };
      state.conversations.push(state.activeConversation);
      state.activeConversationId = state.activeConversation.id;
    }
    localStorage.setItem(`identitification_conversations_${state.activeProfile}`, JSON.stringify(state.conversations));
    localStorage.setItem(`identitification_active_conv_id_${state.activeProfile}`, state.activeConversationId);
  }
  
  if (state.activeConversation && state.activeConversation.characterId) {
    state.activeCharId = state.activeConversation.characterId;
    state.activeCharacter = state.characters.find(c => c.id === state.activeCharId) || state.characters[0];
  }
  
  state.deepSearchActive = localStorage.getItem(`identitification_deep_search_${state.activeProfile}`) === 'true';
  state.deepThinkActive = localStorage.getItem(`identitification_deep_think_${state.activeProfile}`) === 'true';

  loadTheme();
}

function initToggles() {
  const searchBtn = document.getElementById('deep-search-btn');
  const thinkBtn = document.getElementById('deep-think-btn');
  const incognitoBtn = document.getElementById('incognito-btn');
  const mainContent = document.getElementById('main-content');
  
  if (searchBtn) searchBtn.classList.toggle('active', state.deepSearchActive);
  if (thinkBtn) thinkBtn.classList.toggle('active', state.deepThinkActive);
  if (incognitoBtn) incognitoBtn.classList.toggle('active', state.incognitoActive);
  if (mainContent) mainContent.classList.toggle('incognito', state.incognitoActive);
}

// --- Dynamic Sidebar Lists Renderers ---
function renderCharacterList() {
  const listEl = document.getElementById('sidebar-character-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  state.characters.forEach(char => {
    const item = document.createElement('div');
    item.className = 'char-item' + (char.id === state.activeCharId ? ' active' : '');
    
    const info = document.createElement('div');
    info.className = 'char-info';
    
    const nameLine = document.createElement('div');
    nameLine.className = 'char-name';
    nameLine.textContent = char.name;
    
    const subtitle = document.createElement('div');
    subtitle.className = 'char-subtitle';
    subtitle.textContent = char.subtitle;
    
    info.appendChild(nameLine);
    info.appendChild(subtitle);
    item.appendChild(info);
    
    const actions = document.createElement('div');
    actions.className = 'char-actions';
    
    // Edit Action Button (available for all characters including default)
    const editBtn = document.createElement('button');
    editBtn.className = 'char-btn edit';
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    editBtn.title = 'Edit Character';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      openEditCharModal(char.id);
    };
    actions.appendChild(editBtn);
    
    if (char.id !== 'identitification') {
      const delBtn = document.createElement('button');
      delBtn.className = 'char-btn delete';
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      delBtn.title = 'Delete Character';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteCharacter(char.id);
      };
      actions.appendChild(delBtn);
    }
    
    item.appendChild(actions);
    item.onclick = () => selectCharacter(char.id);
    listEl.appendChild(item);
  });
}

function renderHistoryList() {
  const listEl = document.getElementById('sidebar-history-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  state.conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'history-item' + (conv.id === state.activeConversationId ? ' active' : '');
    
    const title = document.createElement('div');
    title.className = 'history-title';
    title.textContent = conv.title;
    
    item.appendChild(title);
    
    const actions = document.createElement('div');
    actions.className = 'history-actions';
    
    const delBtn = document.createElement('button');
    delBtn.className = 'history-btn delete';
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    delBtn.title = 'Delete Session';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    };
    actions.appendChild(delBtn);
    item.appendChild(actions);
    
    item.onclick = () => selectConversation(conv.id);
    listEl.appendChild(item);
  });
}

// --- Character / Persona Operations ---
function selectCharacter(id) {
  state.activeCharId = id;
  state.activeCharacter = state.characters.find(c => c.id === id) || state.characters[0];
  localStorage.setItem(`identitification_active_char_id_${state.activeProfile}`, id);
  
  if (state.incognitoActive) {
    if (state.incognitoConversation) {
      state.incognitoConversation.characterId = id;
    }
  } else if (state.activeConversation) {
    state.activeConversation.characterId = id;
    localStorage.setItem(`identitification_conversations_${state.activeProfile}`, JSON.stringify(state.conversations));
  }
  
  document.getElementById('active-persona-name').textContent = state.activeCharacter.name;
  renderCharacterList();
  
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  
  const currentHistory = state.incognitoActive 
    ? (state.incognitoConversation ? state.incognitoConversation.history : []) 
    : (state.activeConversation ? state.activeConversation.history : []);
    
  const msgsEl = document.getElementById('msgs');
  if (currentHistory.length === 0) {
    initChat();
  } else {
    const systemAlert = document.createElement('div');
    systemAlert.className = 'chip';
    systemAlert.textContent = `switched to ${state.activeCharacter.name}`;
    msgsEl.appendChild(systemAlert);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
}

function handleCharacterFormSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById('char-action-mode').value;
  const charId = document.getElementById('char-edit-id').value;
  
  const name = document.getElementById('char-name').value.trim();
  const subtitle = document.getElementById('char-subtitle').value.trim();
  const instructions = document.getElementById('char-instructions').value.trim();
  
  if (mode === 'edit') {
    const char = state.characters.find(c => c.id === charId);
    if (char) {
      char.name = name.toUpperCase();
      char.subtitle = subtitle;
      char.systemPrompt = instructions;
      
      localStorage.setItem(`identitification_characters_${state.activeProfile}`, JSON.stringify(state.characters));
      
      if (state.activeCharId === charId) {
        state.activeCharacter = char;
        document.getElementById('active-persona-name').textContent = char.name;
      }
    }
  } else {
    // Create Mode
    const newChar = {
      id: 'char-' + Date.now(),
      name: name.toUpperCase(),
      subtitle: subtitle,
      systemPrompt: instructions
    };
    state.characters.push(newChar);
    localStorage.setItem(`identitification_characters_${state.activeProfile}`, JSON.stringify(state.characters));
    selectCharacter(newChar.id);
  }
  
  document.getElementById('char-form').reset();
  window.IdentitificationUI.closeModal('personas-modal');
  renderCharacterList();
}

function openCreateCharModal() {
  document.getElementById('char-form').reset();
  document.getElementById('char-action-mode').value = 'create';
  document.getElementById('char-edit-id').value = '';
  document.getElementById('char-modal-title').textContent = 'Create Agent Character';
  document.getElementById('char-submit-btn').textContent = 'Create & Activate';
  window.openModal('personas-modal');
}

function openEditCharModal(id) {
  const char = state.characters.find(c => c.id === id);
  if (!char) return;
  
  document.getElementById('char-action-mode').value = 'edit';
  document.getElementById('char-edit-id').value = id;
  document.getElementById('char-name').value = char.name;
  document.getElementById('char-subtitle').value = char.subtitle;
  document.getElementById('char-instructions').value = char.systemPrompt;
  
  document.getElementById('char-modal-title').textContent = 'Edit Agent Character';
  document.getElementById('char-submit-btn').textContent = 'Save Changes';
  
  window.openModal('personas-modal');
}

function deleteCharacter(id) {
  if (confirm('Are you sure you want to delete this character?')) {
    state.characters = state.characters.filter(c => c.id !== id);
    localStorage.setItem(`identitification_characters_${state.activeProfile}`, JSON.stringify(state.characters));
    if (state.activeCharId === id) {
      selectCharacter('identitification');
    } else {
      renderCharacterList();
    }
  }
}

// --- Conversation Operations ---
function selectConversation(id) {
  if (state.incognitoActive) {
    toggleIncognito();
  }
  
  state.activeConversationId = id;
  state.activeConversation = state.conversations.find(c => c.id === id) || state.conversations[0];
  localStorage.setItem(`identitification_active_conv_id_${state.activeProfile}`, id);
  
  state.activeCharId = state.activeConversation.characterId || 'identitification';
  state.activeCharacter = state.characters.find(c => c.id === state.activeCharId) || state.characters[0];
  localStorage.setItem(`identitification_active_char_id_${state.activeProfile}`, state.activeCharId);
  
  document.getElementById('active-persona-name').textContent = state.activeCharacter.name;
  renderCharacterList();
  renderHistoryList();
  
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  
  initChat();
}

// --- Dynamic Conversation Greetings update for friendly tone ---
function startNewConversation() {
  if (state.incognitoActive) {
    toggleIncognito();
  }
  
  const newConv = {
    id: 'chat-' + Date.now(),
    title: 'New Session',
    characterId: state.activeCharId,
    history: []
  };
  state.conversations.unshift(newConv);
  state.activeConversationId = newConv.id;
  state.activeConversation = newConv;
  
  localStorage.setItem(`identitification_conversations_${state.activeProfile}`, JSON.stringify(state.conversations));
  localStorage.setItem(`identitification_active_conv_id_${state.activeProfile}`, state.activeConversationId);
  
  selectConversation(newConv.id);
}

function deleteConversation(id) {
  if (confirm('Are you sure you want to delete this session?')) {
    state.conversations = state.conversations.filter(c => c.id !== id);
    localStorage.setItem(`identitification_conversations_${state.activeProfile}`, JSON.stringify(state.conversations));
    
    if (state.activeConversationId === id) {
      if (state.conversations.length > 0) {
        selectConversation(state.conversations[0].id);
      } else {
        startNewConversation();
      }
    } else {
      renderHistoryList();
    }
  }
}

// --- Bottom Toggle Button Controllers ---
function toggleDeepSearch() {
  state.deepSearchActive = !state.deepSearchActive;
  localStorage.setItem(`identitification_deep_search_${state.activeProfile}`, state.deepSearchActive);
  document.getElementById('deep-search-btn').classList.toggle('active', state.deepSearchActive);
}

function toggleDeepThink() {
  state.deepThinkActive = !state.deepThinkActive;
  localStorage.setItem(`identitification_deep_think_${state.activeProfile}`, state.deepThinkActive);
  document.getElementById('deep-think-btn').classList.toggle('active', state.deepThinkActive);
}

function toggleIncognito() {
  state.incognitoActive = !state.incognitoActive;
  document.getElementById('incognito-btn').classList.toggle('active', state.incognitoActive);
  document.getElementById('main-content').classList.toggle('incognito', state.incognitoActive);
  
  if (state.incognitoActive) {
    state.incognitoConversation = {
      id: 'incognito-chat',
      title: 'Incognito Session',
      characterId: state.activeCharId,
      history: []
    };
  } else {
    state.incognitoConversation = null;
  }
  initChat();
}

// --- Main Chat Log Initializer ---
function initChat() {
  const msgsEl = document.getElementById('msgs');
  if (!msgsEl) return;
  msgsEl.innerHTML = '';
  
  if (state.incognitoActive) {
    if (!state.incognitoConversation || state.incognitoConversation.history.length === 0) {
      const greeting = `Secret session initialized. I am ${state.activeCharacter.name}, your adaptable companion. Anything you share here will remain strictly in-memory and will be completely wiped from history once we leave this private window. How can I help you privately right now?`;
      
      const chip = document.createElement('div');
      chip.className = 'chip'; 
      chip.textContent = 'incognito session initialized';
      msgsEl.appendChild(chip);
      
      window.IdentitificationUI.addBubble('aria', greeting, null, false, state, now, renderHistoryList);
    } else {
      const chip = document.createElement('div');
      chip.className = 'chip'; 
      chip.textContent = 'restored incognito session';
      msgsEl.appendChild(chip);
      
      state.incognitoConversation.history.forEach(msg => {
        if (msg.role === 'user') {
          let displayContent = msg.content;
          const match = msg.content.match(/Query: ([\s\S]*)$/);
          if (match) displayContent = match[1];
          window.IdentitificationUI.addBubble('boss', displayContent, null, false, state, now, renderHistoryList);
        } else {
          window.IdentitificationUI.addBubble('aria', msg.content, msg.sources, false, state, now, renderHistoryList);
        }
      });
    }
  } else {
    if (!state.activeConversation || state.activeConversation.history.length === 0) {
      if (state.activeCharId === 'identitification') {
        const greeting = `Hello! I am ${state.activeCharacter.name}, your AI companion. I can converse with you on any topic, browse live global news, and run in-depth research with references. How can I support you today?`;
        
        const chip = document.createElement('div');
        chip.className = 'chip'; 
        chip.textContent = 'conversation initialized';
        msgsEl.appendChild(chip);
        
        window.IdentitificationUI.addBubble('aria', greeting, null, false, state, now, renderHistoryList);
      } else {
        const chip = document.createElement('div');
        chip.className = 'chip'; 
        chip.textContent = `${state.activeCharacter.name.toLowerCase()} session initialized`;
        msgsEl.appendChild(chip);
        
        generateCharacterGreeting();
      }
    } else {
      const chip = document.createElement('div');
      chip.className = 'chip'; 
      chip.textContent = 'restored conversation history';
      msgsEl.appendChild(chip);
      
      state.activeConversation.history.forEach(msg => {
        if (msg.role === 'user') {
          let displayContent = msg.content;
          const match = msg.content.match(/Query: ([\s\S]*)$/);
          if (match) displayContent = match[1];
          window.IdentitificationUI.addBubble('boss', displayContent, null, false, state, now, renderHistoryList);
        } else {
          window.IdentitificationUI.addBubble('aria', msg.content, msg.sources, false, state, now, renderHistoryList);
        }
      });
    }
  }
}

async function generateCharacterGreeting() {
  const msgsEl = document.getElementById('msgs');
  if (!msgsEl) return;
  
  window.IdentitificationUI.showTyping(state.activeCharacter.name);
  
  let systemInstruction = `You are roleplaying as the character "${state.activeCharacter.name}".
Your role/description is: "${state.activeCharacter.subtitle}".
You must adopt this persona completely. Speak, think, and react exactly like them.

Mission: Generate a short, welcoming, in-character greeting message (under 3 sentences) to start a chat with the user. Include expressive, context-appropriate emojis. Do not include any explanations or headers; output only the greeting in character.`;

  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: `Hello! [REMINDER: You are roleplaying as "${state.activeCharacter.name}". Generate a welcoming, in-character greeting message with expressive emojis. Do not break persona.]` }
  ];

  try {
    const headers = { 'Content-Type': 'application/json' };
    let resolvedUrl = '';
    let resolvedModel = '';
    let resolvedKey = '';
    
    if (state.settings && state.settings.method === 'online') {
      resolvedUrl = 'https://api.llm7.io/v1/chat/completions';
      resolvedModel = state.settings.onlineModel || 'meta-llama/llama-3.3-70b-instruct:free';
      resolvedKey = 'unused';
    } else if (state.settings && state.settings.method === 'offline') {
      resolvedUrl = state.settings.localUrl || 'http://localhost:11434/v1/chat/completions';
      resolvedModel = state.settings.localModel || 'deepseek-r1';
      resolvedKey = 'unused';
    } else if (state.settings && state.settings.method === 'apikey') {
      resolvedKey = state.settings.customKey.trim();
      resolvedModel = state.settings.customModel.trim();
      
      if (resolvedKey.startsWith('gsk_')) {
        resolvedUrl = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (resolvedKey.startsWith('sk-or-')) {
        resolvedUrl = 'https://openrouter.ai/api/v1/chat/completions';
      } else {
        resolvedUrl = 'https://openrouter.ai/api/v1/chat/completions';
      }
    } else {
      resolvedUrl = state.settings ? state.settings.apiUrl : '';
      resolvedModel = state.settings ? state.settings.model : '';
      resolvedKey = state.settings ? state.settings.apiKey : '';
    }
    
    if (resolvedKey !== 'unused' && resolvedKey !== '') {
      headers['Authorization'] = `Bearer ${resolvedKey}`;
    } else {
      headers['Authorization'] = 'Bearer unused';
    }

    const bodyObj = {
      model: resolvedModel,
      messages,
      max_tokens: 150,
      temperature: 0.8
    };

    const { reply } = await window.IdentitificationAPI.fetchWithFallback(
      resolvedUrl,
      headers,
      bodyObj,
      () => {}
    );

    window.IdentitificationUI.killTyping(); 
    window.IdentitificationUI.addBubble('aria', reply.trim(), null, true, state, now, renderHistoryList);
  } catch (err) {
    window.IdentitificationUI.killTyping();
    console.error("Failed to generate custom character greeting:", err);
    const fallbackGreeting = `Hello! I am ${state.activeCharacter.name}. How can I assist you today?`;
    window.IdentitificationUI.addBubble('aria', fallbackGreeting, null, true, state, now, renderHistoryList);
  }
}

// --- Query Dispatcher & Fetch orchestrator ---
async function sendMsg() {
  const inpEl = document.getElementById('inp');
  const sendBtn = document.getElementById('send');
  const text = inpEl.value.trim();
  if (!text) return;
  
  inpEl.value = ''; 
  inpEl.style.height = 'auto';

  // Add User bubble to UI and history log
  window.IdentitificationUI.addBubble('boss', text, null, true, state, now, renderHistoryList);
  sendBtn.disabled = true;

  let contextBlock = null;
  let sources = [];

  const setStatus = (msg, show = true) => {
    const bar = document.getElementById('status-bar');
    if (!bar) return;
    bar.textContent = msg;
    bar.style.display = show ? 'block' : 'none';
  };

  // Perform parallel scraping if deep search is toggled
  if (state.deepSearchActive) {
    setStatus('Searching databases & analyzing content...');
    const intel = await window.IdentitificationSearch.gatherIntel(
      text, 
      state.deepSearchActive, 
      window.IdentitificationUI.addResearchStep, 
      window.IdentitificationUI.updateResearchStep, 
      window.IdentitificationUI.removeResearchCard
    );
    contextBlock = intel.contextBlock;
    sources = intel.sources;
  }

  setStatus('Formulating response...');
  window.IdentitificationUI.showTyping(state.activeCharacter.name);

  // Format message queries
  let userContent = contextBlock
    ? `[LIVE_DATA]\n${contextBlock}\n[/LIVE_DATA]\n\nQuery: ${text}`
    : `Query: ${text}`;

  if (state.activeCharId !== 'identitification') {
    userContent += `\n\n[REMINDER: You are roleplaying as "${state.activeCharacter.name}". Always respond strictly in character, matching their tone, speaking style, signature greetings, and vocabulary. Naturally incorporate expressive, context-appropriate emojis to make your tone engaging and alive. Do not break persona under any circumstances.]`;
  }

  let systemInstruction = state.activeCharacter.systemPrompt;
  if (state.activeCharId !== 'identitification') {
    systemInstruction = `You are roleplaying as the character "${state.activeCharacter.name}".
Your role/description is: "${state.activeCharacter.subtitle}".
You must adopt this persona completely. Speak, think, and react exactly like them. Use their signature catchphrases, tone, mannerisms, vocabulary, point of view, and specific language styles (e.g. mixture of English/Hindi, pirate slang, etc.) in every response. Naturally incorporate expressive, context-appropriate emojis. Do NOT respond as a generic AI assistant. Always stay in character.

Core Character Instructions of ${state.activeCharacter.name}:
${state.activeCharacter.systemPrompt}`;
  }
  if (state.deepThinkActive) {
    systemInstruction += `\n\n[DEEP THINKING MODE ACTIVE]\nYou must think extremely deeply. Before providing your response, perform a comprehensive, step-by-step logical reasoning breakdown of the query. Structure your analysis clearly and examine all relevant facts, counter-arguments, and implications.`;
  }

  const currentHistory = state.incognitoActive 
    ? (state.incognitoConversation ? state.incognitoConversation.history : []) 
    : (state.activeConversation ? state.activeConversation.history : []);
    
  const messages = [
    { role: 'system', content: systemInstruction },
    ...currentHistory.map(h => {
      if (h.role === 'user') {
        return { role: 'user', content: h.content };
      } else {
        return { role: 'assistant', content: h.content };
      }
    })
  ];
  
  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content = userContent;
  }

  const apiTemp = state.deepThinkActive ? 0.7 : 0.45;
  const apiMaxTokens = (state.deepSearchActive || state.deepThinkActive) ? 3000 : 1000;

  try {
    const headers = { 'Content-Type': 'application/json' };
    
    let resolvedUrl = '';
    let resolvedModel = '';
    let resolvedKey = '';
    
    if (state.settings && state.settings.method === 'online') {
      resolvedUrl = 'https://api.llm7.io/v1/chat/completions';
      resolvedModel = state.settings.onlineModel || 'meta-llama/llama-3.3-70b-instruct:free';
      resolvedKey = 'unused';
    } else if (state.settings && state.settings.method === 'offline') {
      resolvedUrl = state.settings.localUrl || 'http://localhost:11434/v1/chat/completions';
      resolvedModel = state.settings.localModel || 'deepseek-r1';
      resolvedKey = 'unused';
    } else if (state.settings && state.settings.method === 'apikey') {
      resolvedKey = state.settings.customKey.trim();
      resolvedModel = state.settings.customModel.trim();
      
      if (resolvedKey.startsWith('gsk_')) {
        resolvedUrl = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (resolvedKey.startsWith('sk-or-')) {
        resolvedUrl = 'https://openrouter.ai/api/v1/chat/completions';
      } else {
        resolvedUrl = 'https://openrouter.ai/api/v1/chat/completions';
      }
    } else {
      resolvedUrl = state.settings ? state.settings.apiUrl : '';
      resolvedModel = state.settings ? state.settings.model : '';
      resolvedKey = state.settings ? state.settings.apiKey : '';
    }
    
    if (resolvedKey !== 'unused' && resolvedKey !== '') {
      headers['Authorization'] = `Bearer ${resolvedKey}`;
    } else {
      headers['Authorization'] = 'Bearer unused';
    }

    const bodyObj = {
      model: resolvedModel,
      messages,
      max_tokens: apiMaxTokens,
      temperature: apiTemp
    };

    const { reply } = await window.IdentitificationAPI.fetchWithFallback(
      resolvedUrl,
      headers,
      bodyObj,
      setStatus
    );

    const cleanReply = reply.replace(/\n{3,}/g, '\n\n').trim();

    window.IdentitificationUI.killTyping(); 
    setStatus('', false);
    window.IdentitificationUI.addBubble('aria', cleanReply, sources.length > 0 ? sources : null, true, state, now, renderHistoryList);

  } catch (err) {
    window.IdentitificationUI.killTyping(); 
    setStatus('', false);
    console.error(err);
    
    let detailMsg = `I had trouble connecting to my models to answer that. Please check your settings or API key and try again.\n\n**Error:** \`${err.message}\``;
    
    if (err.message && (err.message.includes('503') || err.message.includes('Failed to fetch') || err.message.includes('400') || err.message.includes('401'))) {
      const tipBox = `<div style="background:rgba(0,242,254,0.1);border-left:3px solid var(--accent);padding:10px 12px;border-radius:6px;font-size:0.8rem;margin-top:12px;"><strong>💡 Tip:</strong> Get a free API Token in 10 seconds from <a href="https://dash.llm7.io" target="_blank" style="color:var(--accent-cyan);text-decoration:underline;">dash.llm7.io</a> and paste it into connection settings to double your limit rates.</div>`;
      const formattedText = window.IdentitificationUI.formatArticleBody(detailMsg, null) + tipBox;
      window.IdentitificationUI.addBubble('aria', 'HTML::' + formattedText, null, false, state, now, renderHistoryList);
    } else {
      window.IdentitificationUI.addBubble('aria', detailMsg, null, false, state, now, renderHistoryList);
    }
  }

  sendBtn.disabled = false;
}

function updateModelBadge() {
  const badge = document.getElementById('model-badge');
  if (!badge || !state.settings) return;
  
  let displayName = '';
  if (state.settings.method === 'online') {
    const model = (state.settings.onlineModel || 'meta-llama/llama-3.3-70b-instruct:free').split('/').pop().slice(0, 12);
    displayName = `Online: ${model}`;
  } else if (state.settings.method === 'offline') {
    displayName = `Offline: ${state.settings.localModel || 'Ollama'}`;
  } else if (state.settings.method === 'apikey') {
    const key = state.settings.customKey || '';
    const prov = key.startsWith('gsk_') ? 'Groq' : (key.startsWith('sk-or-') ? 'OpenRouter' : 'API');
    const model = (state.settings.customModel || '').split('/').pop().slice(0, 12);
    displayName = `${prov}: ${model}`;
  } else {
    const m = state.settings.model || '';
    displayName = m.split('/').pop().slice(0, 20);
  }
  badge.innerHTML = `<span class="status-indicator"></span> ${displayName}`;
}

// --- Account Login, Registration & Session Logout handlers ---
function handleLogin(e) {
  e.preventDefault();
  
  const alertEl = document.getElementById('login-error-alert');
  if (alertEl) alertEl.style.display = 'none';
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  if (!emailInput || !passwordInput) return;
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!email || !password) return;
  
  let userDb = [];
  try {
    userDb = JSON.parse(localStorage.getItem('identitification_user_db')) || [];
  } catch (err) {
    userDb = [];
  }
  
  const existingUser = userDb.find(u => u.email === email);
  if (!existingUser) {
    if (alertEl) {
      document.getElementById('login-error-msg').textContent = 'No account found with this email. Please register first.';
      alertEl.style.display = 'block';
    }
    return;
  }
  
  if (existingUser.password !== password) {
    if (alertEl) {
      document.getElementById('login-error-msg').textContent = 'Incorrect password.';
      alertEl.style.display = 'block';
    }
    return;
  }
  
  localStorage.setItem('identitification_active_profile', email);
  localStorage.setItem('identitification_active_username', existingUser.username);
  state.activeProfile = email;
  state.activeUsername = existingUser.username;
  
  document.getElementById('login-overlay').style.display = 'none';
  emailInput.value = '';
  passwordInput.value = '';
  
  loadProfileData();
  updateModelBadge();
  initToggles();
  renderCharacterList();
  renderHistoryList();
  document.getElementById('active-persona-name').textContent = state.activeCharacter.name;
  initChat();
}

function handleRegister(e) {
  e.preventDefault();
  
  const alertEl = document.getElementById('register-error-alert');
  if (alertEl) alertEl.style.display = 'none';
  
  const usernameInput = document.getElementById('register-username');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');
  const pfpDataInput = document.getElementById('register-pfp-data');
  if (!usernameInput || !emailInput || !passwordInput) return;
  
  const username = usernameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const pfp = pfpDataInput ? pfpDataInput.value : '';
  if (!username || !email || !password) return;
  
  let userDb = [];
  try {
    userDb = JSON.parse(localStorage.getItem('identitification_user_db')) || [];
  } catch (err) {
    userDb = [];
  }
  
  const existingUser = userDb.find(u => u.email === email);
  if (existingUser) {
    if (alertEl) {
      document.getElementById('register-error-msg').textContent = 'An account with this email already exists.';
      alertEl.style.display = 'block';
    }
    return;
  }
  
  userDb.push({ username, email, password, pfp });
  localStorage.setItem('identitification_user_db', JSON.stringify(userDb));
  
  localStorage.setItem('identitification_active_profile', email);
  localStorage.setItem('identitification_active_username', username);
  state.activeProfile = email;
  state.activeUsername = username;
  
  document.getElementById('login-overlay').style.display = 'none';
  usernameInput.value = '';
  emailInput.value = '';
  passwordInput.value = '';
  if (pfpDataInput) pfpDataInput.value = '';
  
  const pfpPreviewContainer = document.getElementById('register-pfp-preview-container');
  if (pfpPreviewContainer) pfpPreviewContainer.style.display = 'none';
  const registerPfpFile = document.getElementById('register-pfp-file');
  if (registerPfpFile) registerPfpFile.value = '';
  
  loadProfileData();
  updateModelBadge();
  initToggles();
  renderCharacterList();
  renderHistoryList();
  document.getElementById('active-persona-name').textContent = state.activeCharacter.name;
  initChat();
}

function handleLogout() {
  if (state.incognitoActive) {
    toggleIncognito();
  }
  localStorage.removeItem('identitification_active_profile');
  localStorage.removeItem('identitification_active_username');
  state.activeProfile = null;
  state.activeUsername = '';
  
  document.getElementById('login-overlay').style.display = 'flex';
  
  document.getElementById('sidebar-history-list').innerHTML = '';
  document.getElementById('sidebar-character-list').innerHTML = '';
  
  const msgsEl = document.getElementById('msgs');
  if (msgsEl) msgsEl.innerHTML = '';
  
  const avatarChar = document.getElementById('profile-avatar-char');
  if (avatarChar) {
    avatarChar.textContent = 'G';
    avatarChar.style.background = '';
  }
  const displayName = document.getElementById('profile-display-name');
  if (displayName) displayName.textContent = 'Guest';
}

// --- Configuration Form Editors ---
function saveSettings(e) {
  e.preventDefault();
  if (!state.settings) return;
  
  const method = document.getElementById('settings-method').value;
  state.settings.method = method;
  
  const onlineModel = document.getElementById('settings-online-model').value;
  state.settings.onlineModel = onlineModel;
  
  const localUrl = document.getElementById('settings-local-url').value.trim();
  const localModel = document.getElementById('settings-local-model').value.trim();
  const customKey = document.getElementById('settings-custom-key').value.trim();
  const customModel = document.getElementById('settings-custom-model').value.trim();
  
  state.settings.localUrl = localUrl || 'http://localhost:11434/v1/chat/completions';
  state.settings.localModel = localModel || 'deepseek-r1';
  state.settings.customKey = customKey;
  state.settings.customModel = customModel || 'meta-llama/llama-3.3-70b-instruct:free';
  
  // Backwards compatibility sync for other modules
  if (method === 'online') {
    state.settings.apiUrl = 'https://api.llm7.io/v1/chat/completions';
    state.settings.model = onlineModel;
    state.settings.apiKey = 'unused';
  } else if (method === 'offline') {
    state.settings.apiUrl = state.settings.localUrl;
    state.settings.model = state.settings.localModel;
    state.settings.apiKey = 'unused';
  } else if (method === 'apikey') {
    state.settings.apiKey = customKey;
    state.settings.model = customModel;
    
    if (customKey.startsWith('gsk_')) {
      state.settings.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    } else if (customKey.startsWith('sk-or-')) {
      state.settings.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    } else {
      state.settings.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }
  }
  
  localStorage.setItem(`identitification_settings_${state.activeProfile}`, JSON.stringify(state.settings));
  updateModelBadge();
  
  window.IdentitificationUI.closeModal('settings-modal');
}

function saveProfileSettings(e) {
  e.preventDefault();
  const newUsername = document.getElementById('profile-settings-username').value.trim();
  
  if (newUsername) {
    let userDb = [];
    try {
      userDb = JSON.parse(localStorage.getItem('identitification_user_db')) || [];
    } catch (err) {
      userDb = [];
    }
    
    const currentUser = userDb.find(u => u.email === state.activeProfile);
    if (currentUser) {
      currentUser.username = newUsername;
      currentUser.pfp = window.IdentitificationCropper.getTempProfilePfpDataUrl();
      localStorage.setItem('identitification_user_db', JSON.stringify(userDb));
      
      localStorage.setItem('identitification_active_username', newUsername);
      state.activeUsername = newUsername;
    }
  }
  
  loadProfileData();
  window.IdentitificationUI.closeModal('profile-modal');
}

function clearChat() {
  if (state.incognitoActive) {
    if (state.incognitoConversation) {
      state.incognitoConversation.history = [];
    }
  } else if (state.activeConversation) {
    state.activeConversation.history = [];
    state.activeConversation.title = 'New Session';
    localStorage.setItem(`identitification_conversations_${state.activeProfile}`, JSON.stringify(state.conversations));
    renderHistoryList();
  }
  initChat();
}

// --- Theme Customization Engine ---
function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 242, b: 254 };
}

function generateSecondaryColor(hex) {
  const rgb = hexToRgb(hex);
  let r = Math.min(255, Math.max(0, rgb.r + 30));
  let g = Math.min(255, Math.max(0, rgb.g - 40));
  let b = Math.min(255, Math.max(0, rgb.b + 50));
  
  const toHex = (c) => {
    const h = c.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyTheme(primaryHex, secondaryHex) {
  const root = document.documentElement;
  
  const primaryRgb = hexToRgb(primaryHex);
  const secondaryRgb = hexToRgb(secondaryHex);
  
  root.style.setProperty('--accent-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
  root.style.setProperty('--accent-cyan-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
  
  const darken = (c) => Math.max(0, Math.floor(c * 0.8));
  root.style.setProperty('--accent-hover-hex', `rgb(${darken(primaryRgb.r)}, ${darken(primaryRgb.g)}, ${darken(primaryRgb.b)})`);
  
  if (state.activeProfile) {
    localStorage.setItem(`identitification_theme_primary_${state.activeProfile}`, primaryHex);
    localStorage.setItem(`identitification_theme_secondary_${state.activeProfile}`, secondaryHex);
  }
}

const THEME_PRESETS = {
  cyan: { primary: '#3866f2', secondary: '#00f2fe' },
  blue: { primary: '#1e40af', secondary: '#3b82f6' },
  green: { primary: '#047857', secondary: '#10b981' },
  purple: { primary: '#6d28d9', secondary: '#a855f7' },
  red: { primary: '#b91c1c', secondary: '#ef4444' },
  gold: { primary: '#d97706', secondary: '#f59e0b' }
};

function selectThemePreset(presetName) {
  const preset = THEME_PRESETS[presetName];
  if (!preset) return;
  
  applyTheme(preset.primary, preset.secondary);
  
  if (state.activeProfile) {
    localStorage.setItem(`identitification_theme_preset_${state.activeProfile}`, presetName);
    localStorage.removeItem(`identitification_theme_custom_${state.activeProfile}`);
  }
  
  const btns = document.querySelectorAll('.theme-preset-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('data-preset') === presetName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  const hexLabel = document.getElementById('custom-color-hex');
  if (hexLabel) hexLabel.textContent = preset.secondary;
  const pickerInput = document.getElementById('theme-color-primary');
  if (pickerInput) pickerInput.value = preset.secondary;
}

function handleCustomColorInput(value) {
  const secondary = value;
  const primary = generateSecondaryColor(value);
  
  applyTheme(primary, secondary);
  
  if (state.activeProfile) {
    localStorage.setItem(`identitification_theme_custom_${state.activeProfile}`, secondary);
    localStorage.removeItem(`identitification_theme_preset_${state.activeProfile}`);
  }
  
  const btns = document.querySelectorAll('.theme-preset-btn');
  btns.forEach(btn => btn.classList.remove('active'));
  
  const hexLabel = document.getElementById('custom-color-hex');
  if (hexLabel) hexLabel.textContent = secondary;
}

function loadTheme() {
  if (!state.activeProfile) return;
  
  const customColor = localStorage.getItem(`identitification_theme_custom_${state.activeProfile}`);
  const presetName = localStorage.getItem(`identitification_theme_preset_${state.activeProfile}`) || 'cyan';
  
  if (customColor) {
    handleCustomColorInput(customColor);
    const pickerInput = document.getElementById('theme-color-primary');
    if (pickerInput) pickerInput.value = customColor;
  } else {
    selectThemePreset(presetName);
  }
}

async function autoGenerateCharacterPrompt() {
  const nameInput = document.getElementById('char-name');
  const genBtn = document.getElementById('char-generate-btn');
  const subtitleInput = document.getElementById('char-subtitle');
  const promptTextarea = document.getElementById('char-instructions');
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter a Character Name first.');
    nameInput.focus();
    return;
  }
  
  const origBtnText = genBtn.innerHTML;
  genBtn.innerHTML = `<span>⏳</span> Generating...`;
  genBtn.disabled = true;
  
  let systemInstruction = `You are a character design agent.
Given a character name, you must output a JSON object containing:
1. "subtitle": A short, descriptive role or title (e.g. "PM of India" or "Visionary Leader" or "High-Tech Billionaire"). Under 6 words.
2. "systemPrompt": A comprehensive system instruction / personality prompt (about 150-200 words) defining how they speak, think, react, their tone, catchphrases, vocabulary, and specific mannerisms. Instruct them to naturally use expressive, character-appropriate emojis in their dialogue.

Format your response strictly as a JSON object, without markdown blocks or explanation. Output only the valid JSON.
Example format:
{
  "subtitle": "...",
  "systemPrompt": "..."
}`;

  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: `Generate a personality for: "${name}"` }
  ];

  try {
    const headers = { 'Content-Type': 'application/json' };
    let resolvedUrl = '';
    let resolvedModel = '';
    let resolvedKey = '';
    
    if (state.settings && state.settings.method === 'online') {
      resolvedUrl = 'https://api.llm7.io/v1/chat/completions';
      resolvedModel = state.settings.onlineModel || 'meta-llama/llama-3.3-70b-instruct:free';
      resolvedKey = 'unused';
    } else if (state.settings && state.settings.method === 'offline') {
      resolvedUrl = state.settings.localUrl || 'http://localhost:11434/v1/chat/completions';
      resolvedModel = state.settings.localModel || 'deepseek-r1';
      resolvedKey = 'unused';
    } else if (state.settings && state.settings.method === 'apikey') {
      resolvedKey = state.settings.customKey.trim();
      resolvedModel = state.settings.customModel.trim();
      
      if (resolvedKey.startsWith('gsk_')) {
        resolvedUrl = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (resolvedKey.startsWith('sk-or-')) {
        resolvedUrl = 'https://openrouter.ai/api/v1/chat/completions';
      } else {
        resolvedUrl = 'https://openrouter.ai/api/v1/chat/completions';
      }
    } else {
      resolvedUrl = state.settings ? state.settings.apiUrl : '';
      resolvedModel = state.settings ? state.settings.model : '';
      resolvedKey = state.settings ? state.settings.apiKey : '';
    }
    
    if (resolvedKey !== 'unused' && resolvedKey !== '') {
      headers['Authorization'] = `Bearer ${resolvedKey}`;
    } else {
      headers['Authorization'] = 'Bearer unused';
    }

    const bodyObj = {
      model: resolvedModel,
      messages,
      max_tokens: 600,
      temperature: 0.7
    };

    const { reply } = await window.IdentitificationAPI.fetchWithFallback(
      resolvedUrl,
      headers,
      bodyObj,
      () => {}
    );
    
    let cleanReply = reply.trim();
    if (cleanReply.startsWith('```')) {
      cleanReply = cleanReply.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    }
    
    const data = JSON.parse(cleanReply);
    if (data.subtitle) subtitleInput.value = data.subtitle;
    if (data.systemPrompt) promptTextarea.value = data.systemPrompt;
    
  } catch (err) {
    console.error("Failed to auto-generate character prompt:", err);
    alert("Could not generate personality details automatically. Please verify your connection settings or enter details manually.");
  } finally {
    genBtn.innerHTML = origBtnText;
    genBtn.disabled = false;
  }
}

// --- App Event Handlers & Dom Bindings ---
document.addEventListener('DOMContentLoaded', () => {
  const inpEl = document.getElementById('inp');
  const sendBtn = document.getElementById('send');
  const msgsEl = document.getElementById('msgs');
  
  // Set window-level triggers for modals and buttons
  window.openModal = (id) => window.IdentitificationUI.openModal(id, state, window.IdentitificationCropper.setTempProfilePfpDataUrl);
  window.closeModal = (id) => window.IdentitificationUI.closeModal(id);
  window.startNewConversation = startNewConversation;
  window.handleCharacterFormSubmit = handleCharacterFormSubmit;
  window.openCreateCharModal = openCreateCharModal;
  window.openEditCharModal = openEditCharModal;
  window.saveSettings = saveSettings;
  window.saveProfileSettings = saveProfileSettings;
  window.handleLogout = handleLogout;
  window.clearChat = clearChat;
  
  // Theme binders
  window.selectThemePreset = selectThemePreset;
  window.handleCustomColorInput = handleCustomColorInput;
  window.autoGenerateCharacterPrompt = autoGenerateCharacterPrompt;
  
  window.toggleDeepSearch = toggleDeepSearch;
  window.toggleDeepThink = toggleDeepThink;
  window.toggleIncognito = toggleIncognito;
  window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  };
  
  window.handleLogin = handleLogin;
  window.handleRegister = handleRegister;
  window.showLoginView = () => {
    document.getElementById('login-view-register').classList.remove('active');
    document.getElementById('login-view-main').classList.add('active');
  };
  window.showRegisterView = () => {
    document.getElementById('login-view-main').classList.remove('active');
    document.getElementById('login-view-register').classList.add('active');
  };
  
  // Upload and Cropper binders
  window.handleRegisterPfpUpload = (e) => window.IdentitificationCropper.handlePfpUpload(e, 'register');
  window.handleProfilePfpUpload = (e) => window.IdentitificationCropper.handlePfpUpload(e, 'profile');
  window.closeCropperModal = () => window.IdentitificationCropper.closeCropperModal();
  window.applyCrop = () => window.IdentitificationCropper.applyCrop();
  
  // Modal overlay click closer
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.style.display = 'none';
    }
  });

  // Main chat send binders
  if (sendBtn) sendBtn.addEventListener('click', sendMsg);
  
  if (inpEl) {
    inpEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        sendMsg(); 
      }
    });
    
    inpEl.addEventListener('input', () => {
      inpEl.style.height = 'auto';
      inpEl.style.height = Math.min(inpEl.scrollHeight, 140) + 'px';
    });
    
    inpEl.addEventListener('focus', () => {
      setTimeout(() => { 
        if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight; 
      }, 350);
    });
  }

  // Setup hover tooltips on message citations
  if (msgsEl) window.IdentitificationUI.setupCitationTooltips(msgsEl);

  // Bootstrap Profile Loading
  if (state.activeProfile && state.activeUsername) {
    document.getElementById('login-overlay').style.display = 'none';
    loadProfileData();
    updateModelBadge();
    initToggles();
    renderCharacterList();
    renderHistoryList();
    document.getElementById('active-persona-name').textContent = state.activeCharacter.name;
    initChat();
  } else {
    document.getElementById('login-overlay').style.display = 'flex';
  }
});
