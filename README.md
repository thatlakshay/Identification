# 🌌 Ankush AI — Advanced Research Intelligence Agent

Ankush AI is a premium, client-side intelligence dashboard and online research assistant. It features advanced parallel web scraping, deep thinking logical reasoning workflows, interactive citations, custom model configurations, and a clean dark theme UI.

---

## 🚀 Key Features

### 🔍 1. High-Fidelity Online Research (Deep Search)
* **Real Web Searches:** Queries DuckDuckGo's static HTML engine and Google News RSS aggregators in parallel to get valid index references.
* **Maximum Reading Scraper:** Parses and extracts the main text body (up to 2,500 characters per page) from the top 3-4 search result links using a fast multi-proxy fallback chain (`corsproxy.io` $\rightarrow$ `codetabs.com` $\rightarrow$ `allorigins.win`).
* **Live Scraper Progress:** Watch the agent read articles in real time through dynamic status updates (e.g. `Reading "Article Title" (bbc.com)...`).

### 🧠 2. Deep Thinking Mode
* Forces reasoning models (like DeepSeek R1) to execute a structured, step-by-step logical breakdown, examining all facts, counter-arguments, and implications before responding.

### 🔗 3. Interactive Inline Citations & Footnotes
* **Hover Tooltips:** Hovering over any superscript reference (e.g., `[1]`) shows the exact article headline.
* **Direct Navigation:** Clicking on an inline citation or bibliography source link opens the live, direct URL in a new tab (bypassing Google News redirect wrappers to eliminate 404 errors).
* **Cross-Referenced Bibliography:** Overrides LLM url hallucinations by forcing the output layout to match the original crawler metadata URLs.

### ⚙️ 4. Change Model & Smart Routing
* Switch between models in a clean, visual grid:
  1. **General Research** (*Balanced & Thorough*)
  2. **Deep Reasoning** (*Math & Logic*)
  3. **Fast Response** (*Speed & Retrieval*)
  4. **Groq LPU Speed** (*Lightning Fast 70B*)
* **Multi-Provider API Key/Token Support**: Includes an always-visible API Key/Token field. You can leave it blank to run keyless. Paste a free token from [dash.llm7.io](https://dash.llm7.io), an OpenRouter key (`sk-or-...`), or a Groq key (`gsk-...`) to increase rate limits. The app automatically detects the key prefix, routes to the appropriate endpoint (LLM7, OpenRouter, or Groq), and maps the model selections accordingly.
* **Dual Fallback Chains**: If using the free gateway (or OpenRouter), if a model goes down, it cycles between all free options. If querying Groq, it fails over between Groq LPU models (`llama-3.3-70b-versatile` $\rightarrow$ `llama-3.3-70b-specdec` $\rightarrow$ `deepseek-r1-distill-llama-70b`).

### 🕶️ 5. Incognito Mode
* Toggles a secure session where all chat logs, briefing contexts, and histories are kept strictly in-memory and deleted immediately upon turning off incognito or refreshing the page.

### 🖼️ 6. Circular Profile Picture Cropper
* Upload custom avatars during sign-up or profile settings. Uses an inline `Cropper.js` overlay masked to a circular transparent PNG base64 representation.

---

## 🛠️ Technology Stack
* **Frontend Structure:** HTML5 & Semantic Elements
* **Styling & Aesthetics:** Vanilla CSS3 (glassmorphic cards, glowing borders, custom cyan accents, scrollbar transitions)
* **Logic:** Vanilla JavaScript (ES6, DOMParser, parallel async fetch operations)
* **Libraries:** `Cropper.js` (for avatar cropping)

---

## 💻 Local Setup & Running

To run the application locally without configuration issues:

1. Double-click the **`run.bat`** file in the root folder.
2. The batch file will detect if you have **Node.js** or **Python** installed and boot up a local web server:
   * **Node.js:** Launches `http-server` on [http://localhost:8080](http://localhost:8080/)
   * **Python:** Launches `http.server` on [http://localhost:8000](http://localhost:8000/)
3. If neither is installed, you can still run the file by double-clicking **`index.html`** directly in your browser.

---

## 📁 File Structure

* `index.html` — Core application file containing all layout HTML, styling CSS, and JS logic.
* `ankush_logo.svg` — Custom wave logo used in avatars and stream loaders.
* `run.bat` — Automated command launcher for development servers.
* `vercel.json` — Vercel single-page application routing configurations.
