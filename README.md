# D'Note (D--Note) - Agent-First Word & Whiteboard Workspace

> **Marketing Name:** D'Note  
> **Repository:** D--Note  
> **Ecosystem:** D'Verse  

A next-generation, **Agent-First** document processor and collaborative visual workspace. D'Note combines the complete formatting fidelity, page-oriented layout, and OpenXML export of **Microsoft Word** with the freeform creative power of **WebBoard**'s stylus and whiteboard canvas.

---

## ✨ Key Highlights

### 🤖 Agent-First Document Architecture
- **Direct AST Tool Calling**: Unlike generic AI editors that only produce basic markdown, D'Note's AI Agent (`D-Ai` engine) has discrete semantic tools to build rich Word elements:
  - `insert_styled_table` (Zebra striping, cell shading, custom border weights)
  - `insert_callout` (Visual info, tip, warning, and quote admonitions)
  - `insert_whiteboard_diagram` (Flowcharts, mindmaps, architecture blocks)
  - `insert_math_equation` (Live KaTeX rendering & Word OMML export)
  - `configure_page_layout` (A4/Letter page sizes, margins, headers, and footers)
- **Real-Time Diff & Staging**: Review AI-generated sections with **Accept / Reject** controls before inserting them into your document.

### 📄 True Paginated Microsoft Word Experience
- **Page Sheets & Margins**: Visual A4 and Letter sheets with customizable margin gutters (Top, Bottom, Left, Right).
- **In-Page Headers & Footers**: Dynamic page counters (`Page X of Y`), title synchronization, and confidential markers.
- **Native `.docx` Export**: 100% compliant **Office Open XML (ECMA-376)** exporter preserving tables, styles, and embedded whiteboard drawings as vector DrawingML with high-DPI fallbacks.

### 🎨 Infinite Collaborative Whiteboard
- **Ported from WebBoard**: Pen drawing, pressure smoothing, stylus auto-detection, geometric shapes (rectangles, circles, triangles, lines, arrows), and object eraser.
- **Dual-Mode Canvas**:
  - **Document Mode**: Focus on paginated document drafting with inline embedded drawing canvases.
  - **Split Mode**: Side-by-side view (Word document on left, whiteboard on right).
  - **Whiteboard Mode**: Fullscreen infinite canvas with zoom, pan, and 1-click "Insert into Document".

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Create `.env.local` to configure AI model keys or Supabase cloud storage:
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: If no API keys are configured, D'Note automatically uses the open Pollinations model fallback or custom keys entered directly in the Agent panel).*

### 3. Run Development Server
```bash
# Start frontend with Vite
npm run dev

# Or start full production server
npm run build
npm start
```
Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:5173` for Vite dev server).

---

## 📁 Architecture

```
D--Note/
├── api/
│   ├── chat.js            # D-Ai Multi-Provider Streaming Agent Backend
│   ├── search.js          # Web search tool provider
│   ├── image.js           # Multi-engine image generation
│   ├── upload.js          # Vercel Blob file uploader
│   └── save.js            # Document & Board persistence
├── src/
│   ├── types/
│   │   └── document.ts    # D'Note Word Document AST
│   ├── services/
│   │   ├── agentService.ts# AI Tool-Calling Agent Service
│   │   └── docxExporter.ts# Office Open XML (.docx) Exporter
│   ├── components/
│   │   ├── Header.tsx     # Mode switcher, layout settings, .docx export
│   │   ├── document/      # Paginated Word Document view & blocks
│   │   │   ├── PaginatedDocumentView.tsx
│   │   │   └── blocks/    # Headings, Paragraphs, Tables, Callouts, Math
│   │   ├── whiteboard/    # WebBoard canvas, stylus tools, shapes
│   │   │   └── WhiteboardView.tsx
│   │   └── agent/         # AI Co-Pilot panel with diff review
│   │       └── AgentPanel.tsx
│   ├── App.tsx            # Dual-Mode workspace manager
│   ├── main.tsx           # React 19 mount point
│   └── index.css          # Tailwind CSS v4 & KaTeX styling
├── server.js              # Unified Express & D-Ai API server
├── vite.config.ts         # Vite bundler configuration
└── package.json
```

---

## 📝 License
MIT © Dhairya Shah
