# Markdown to Action Plan

**Markdown to Action Plan** is a powerful tool that synthesizes multiple raw markdown documentation files into a single, cohesive, and highly detailed **Master Implementation Playbook**.

Unlike standard AI summaries, this tool focuses on **tactical execution**—providing step-by-step UI instructions, specific commands, and clear success criteria for every task.

## 🚀 Key Features

- **Unified Master Plan:** Consolidates multiple source files into one logical, step-by-step implementation document.
- **Tactical & Atomic:** Every action is described in terms of specific UI interactions (buttons, menus, URLs) and expected outcomes.
- **Multi-Provider Support:** Switch between **OpenAI (GPT-4o / GPT-4o mini)**, **Perplexity (Sonar)**, **Gemini 2.0 Flash**, and **OpenRouter** (GPT-4o mini, Qwen, Llama, Mistral presets).
- **Milestone Tracking:** High-level milestones with explicit "✅ Done when" criteria to track your progress.
- **Flexible Export Options:**
  - **Download .md:** Full raw markdown for your local notes.
  - **Download .docx:** Professional Word document (formatted for reading).
  - **Copy for Google Docs:** Specialized "Rich Text" copy-paste that preserves all formatting when pasted into a GDoc.
- **MCP Server Integration:** Ready to be used as a tool within the Model Context Protocol (MCP) ecosystem.

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **AI Integration:** Standard OpenAI-compatible API fetching
- **Markdown Rendering:** `react-markdown` + `remark-gfm`
- **Document Export:** `html-to-docx` (Server-side) + `file-saver`

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 18+ 
- npm or yarn

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your API keys:
```text
OPENAI_API_KEY=your_key
PERPLEXITY_API_KEY=your_key
GEMINI_API_KEY=your_key
OPENROUTER_API_KEY=your_key
```

### 4. Running the Web App

**Windows (easiest):** double-click `run.bat` or `start-action-plan.bat` in the project folder. It installs dependencies if needed, prints which API keys are set, starts the dev server, and opens http://localhost:3000. Keep the console window open while you use the app.

If the server crashes immediately with a Turbopack error, run `npm run dev` from the project folder (the script uses webpack to avoid that on Windows).

**Port in use / dev lock error:** run `stop-action-plan.bat` first (stops old servers on ports 3000–3001 and clears the `.next` lock), then `run.bat` again.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Smoke-test configured providers

**Windows:** run `check-llms.bat`

```bash
npm run check:llms
```

Runs a minimal fixture against each provider that has an API key in `.env.local`.

### 6. Running the MCP Server
To use this as an MCP tool (e.g., in Claude Desktop or Cursor):
```bash
npx tsx src/mcp-server.ts
```

## 📖 Usage Guide

1. **Upload:** Drag and drop one or more `.md` files containing your project requirements or documentation.
2. **Select Provider:** Choose your preferred AI model.
3. **Generate:** Click "Generate Action Plan" to synthesize the files.
4. **Export:** Download the result or copy it directly into your project management tools.

## 🤖 System Prompt (Tactical Playbook)
The tool uses a specialized "Tactical Playbook" system prompt that enforces:
- UI-first language (e.g., Settings → Integrations → Connect).
- Success criteria for every task ("✅ Done when: ...").
- Explicit prerequisite checks ("Requires: ...").
- Zero-abstraction implementation details.

---

Built for developers and project managers who need to move from "What to build" to "How to build it" instantly.
