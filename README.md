# 🌌 Ankush AI — Premium Character AI Console

Ankush AI is a premium, client-side Character AI console and immersive conversational dashboard. It allows users to create, customize, and chat with dynamic character personas, backed by advanced real-time web context verification (Deep Search), step-by-step cognitive reasoning (Deep Think), custom API/connection routing, and a sleek, theme-customizable glassmorphic UI.

---

## 🚀 Key Features

### 💬 1. Conversational Companions & Custom Personas
* **Dynamic Character Library:** Create custom agents with specialized subtitle tags and detailed system prompt guidelines instructing how they should talk, think, and react.
* **Instant Auto-Generation:** Prompt the console to dynamically generate unique character prompts and instruction sets based on your short descriptions.

### 🌐 2. Web Context Grounding (Deep Search)
* **Real-Time Data Integration:** Feeds live queries to search engines and Wikipedia in parallel to supply characters with factual current context.
* **Smart Article Reading:** Automatically parses main text paragraphs from web sources using a multi-proxy fallback network (`corsproxy.io` $\rightarrow$ `codetabs.com` $\rightarrow$ `allorigins.win`).
* **Live Scanning Indicator:** Watch the dashboard track database crawls dynamically via inline status steps.

### 🧠 3. Cognitive Deep Thinking Mode
* Forces reasoning models (like DeepSeek R1) to execute structured, step-by-step logical reasoning sequences, verifying assumptions and outlining thought patterns before replying.

### 🔗 4. Interactive Citation Tooltips & Footnotes
* **Hover References:** Hovering over superscript citations (e.g. `[1]`) shows the referenced web source headline.
* **Direct Navigation:** Clicking inline citation numbers opens direct source links in a new tab, skipping redirect loops to prevent errors.

### ⚙️ 5. Smart Model Connection Routing
* Switch between models and APIs in a clean, visual settings grid:
  1. **General Chat** (*Warm & Supportive*)
  2. **Deep Reasoning** (*Analytical & Math*)
  3. **Fast Responses** (*Speed & Retrieval*)
  4. **Groq LPU Speed** (*Lightning Fast 70B*)
* **Multi-Provider Key Support:** Supports free cloud connections, OpenRouter keys (`sk-or-...`), Groq endpoints (`gsk-...`), or local server endpoints (Ollama) with automatic prefix routing.

### 🕶️ 6. Incognito Stealth Mode
* Toggles a secure session where chat logs and briefing contexts are held exclusively in-memory, clearing instantly when incognito is disabled or the page is refreshed.

### 🖼️ 7. Circular Profile Picture Cropper
* Upload custom avatars during character creation or user registration. Includes an inline `Cropper.js` workspace locked to a clean circular mask.

### 🦎 8. Animated Cyber-Chameleon Branding & HUD
* **Dynamic Micro-Animations:** SVG orbits spin in alternating directions, and the central eye pulses to create a live, responsive tech aesthetic.
* **Theme-Bound Adaptation:** Coordinates with custom accent color selections (Cyan, Sapphire, Emerald, Amethyst, Crimson, Solar Gold) by referencing root CSS variables inside the inline vector paths.

---

## 🛠️ Technology Stack
* **Frontend Structure:** HTML5 & Semantic Elements
* **Styling & Aesthetics:** Vanilla CSS3 (glassmorphic cards, glowing borders, custom accents, scrolling transitions)
* **Logic:** Vanilla JavaScript (ES6, DOMParser, parallel async fetch operations)
* **Libraries:** `Cropper.js` (for avatar cropping)

---

## 💻 Local Setup & Running

To run the application locally:

1. Double-click the **`run.bat`** file in the root folder.
2. The batch file will detect your environment and boot a local server:
   * **Node.js:** Launches `http-server` on [http://localhost:8080](http://localhost:8080/)
   * **Python:** Launches `http.server` on [http://localhost:8000](http://localhost:8000/)
3. Alternatively, open **`index.html`** directly in any modern browser.

---

## 📁 File Structure

* `index.html` — Core application file containing all layout HTML, styling CSS, and JS logic.
* `ankush_logo.svg` — Premium glowing cyber-chameleon logo used in UI headers and favicons.
* `run.bat` — Automated command launcher for development servers.
* `vercel.json` — Vercel single-page application routing configurations.
