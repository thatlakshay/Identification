/**
 * Chat Completions API & Model Fallback Routing Engine for Identitification
 */

/**
 * Sends a chat completion query to the selected AI provider with a robust fallback chain
 * @param {string} url Endpoint URL
 * @param {Object} headers Request headers
 * @param {Object} bodyObj JSON payload body containing messages, model, etc.
 * @param {function} setStatus Callback to update the user with real-time routing statuses
 */
async function fetchWithFallback(url, headers, bodyObj, setStatus) {
  const isFreeGateway = url.includes('llm7.io') || url.includes('openrouter.ai');
  const isKeyless = headers['Authorization'] === 'Bearer unused' || !headers['Authorization'];
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  
  // 1. Resolve fallback chain based on provider and authorization status
  let modelChain = [bodyObj.model];
  if (isLocalhost) {
    // Local Ollama targets don't use generic fallbacks
  } else if (isFreeGateway) {
    if (isKeyless) {
      const keylessModels = ['gemma3:27b', 'codestral-latest'];
      keylessModels.forEach(m => {
        if (m !== bodyObj.model) {
          modelChain.push(m);
        }
      });
    } else {
      const freeModels = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemini-2.5-flash:free',
        'deepseek/deepseek-r1:free'
      ];
      freeModels.forEach(m => {
        if (m !== bodyObj.model) {
          modelChain.push(m);
        }
      });
    }
  } else if (url.includes('groq.com')) {
    const groqModels = [
      'llama-3.3-70b-versatile',
      'llama-3.3-70b-specdec',
      'deepseek-r1-distill-llama-70b'
    ];
    groqModels.forEach(m => {
      if (m !== bodyObj.model) {
        modelChain.push(m);
      }
    });
  }
  
  let lastError = null;
  
  // 2. Iterate through fallback models
  for (let attempt = 0; attempt < modelChain.length; attempt++) {
    const currentModel = modelChain[attempt];
    const currentBody = { ...bodyObj, model: currentModel };
    
    if (attempt > 0) {
      const cleanModelName = currentModel.split('/').pop().slice(0, 15);
      setStatus(`Gateway busy. Retrying with fallback model (${cleanModelName})...`);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // 3. Retry each model up to 2 times
    for (let retry = 0; retry < 2; retry++) {
      if (retry > 0) {
        const cleanModelName = currentModel.split('/').pop().slice(0, 15);
        setStatus(`Retrying attempt ${retry + 1} for ${cleanModelName}...`);
        await new Promise(r => setTimeout(r, 1000));
      }
      
      try {
        let res;
        // Try direct fetch first
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(currentBody)
          });
        } catch (directErr) {
          // If direct fetch fails (e.g. due to CORS or local file protocols) and it's not localhost, fall back to CORS proxy
          if (!isLocalhost) {
            console.warn("Direct fetch failed, retrying via CORS proxy:", directErr);
            const requestUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
            res = await fetch(requestUrl, {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(currentBody)
            });
          } else {
            throw directErr;
          }
        }
        
        if (res.ok) {
          const data = await res.json();
          const reply = data?.choices?.[0]?.message?.content?.trim();
          if (reply) {
            return { reply, usedModel: currentModel };
          }
          throw new Error('Empty response from model');
        } else {
          let errorDetail = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson && errJson.error && errJson.error.message) {
              errorDetail = `${res.status}: ${errJson.error.message}`;
            }
          } catch (e) {
            try {
              const errText = await res.text();
              if (errText) errorDetail = `${res.status}: ${errText.slice(0, 150)}`;
            } catch (e2) {}
          }
          throw new Error(errorDetail);
        }
      } catch (err) {
        lastError = err;
        console.warn(`Attempt failed for model ${currentModel}:`, err);
        if (err.message && err.message.includes('400')) {
          break; 
        }
      }
    }
  }
  
  throw lastError || new Error('All model fallback options failed.');
}

// Expose utilities globally
window.IdentitificationAPI = {
  fetchWithFallback
};
