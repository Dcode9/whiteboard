# WebBoard - Collaborative Whiteboard

A modern, responsive whiteboard application with drawing tools, shape support, text editing, and cloud storage integration via Google Sign-in and Supabase.

## ✨ Features

- **Drawing Tools** - Pen with custom colors and brush sizes
- **Shapes** - Lines, rectangles, circles, and triangles  
- **Text Editor** - Add formatted text (bold, italic, underline)
- **Eraser** - Object, pixel, or cut mode (eraser-only deletion)
- **Move & Resize** - Select shapes and resize with 8-directional handles
- **Stylus Support** - Automatic pen tool on stylus input
- **Undo/Redo** - Full editing history
- **Canvas Customization** - Colors, patterns, zoom
- **Dark Mode** - Toggle theme
- **Google Sign-in** - Secure authentication
- **Cloud Storage** - Supabase with per-account isolation
- **Local Boards** - Browser storage fallback
- **Responsive** - Desktop and tablet friendly

## 🚀 Quick Start

### Setup
1. `npm install`
2. Follow **[ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)** for Google OAuth & Supabase config
3. `npm start` or `vercel dev`
4. Open `http://localhost:3000`

### Important
⚠️ Don't use the demo Google Client ID in production—create your own credentials in Google Cloud Console.

## 📁 Structure

```
index.html           # Main app (HTML, CSS, JS)
assets/
  whiteboard.css    # UI styles
  js/app.js         # Auth & board management
api/                 # Vercel serverless endpoints
ENV_SETUP_GUIDE.md  # Detailed configuration
```

## 🎯 Key Interactions

| Action | Behavior |
|--------|----------|
| **Stylus input** | Auto-activates pen tool |
| **Right-click** | Ignored (no menu) |
| **Shape click** → **Move tool** | Select and grab handles to resize |
| **Eraser tool** | Only this tool can delete |
| **2-finger touch** | Pan and zoom |
| **Ctrl+Z** | Undo |
| **Ctrl+Y** | Redo |

## 🔒 Security

✅ Google JWT verification  
✅ Supabase Row Level Security  
✅ User-specific data filtering  
✅ No credentials in frontend code

**Production**: Enable rate limiting, CORS, and monitoring (see [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md#security-considerations)).

## 📚 API Endpoints

- `POST /api/google` — Verify Google JWT  
- `POST /api/save` — Save/update drawing  
- `GET /api/load/:id` — Load drawing  
- `GET /api/list` — List user's drawings  
- `DELETE /api/delete/:id` — Delete drawing

## 🐛 Troubleshooting

**Google Sign-in blocked?** → Use your own OAuth credentials (see ENV_SETUP_GUIDE.md)  
**Drawings not saving?** → Check Supabase credentials and network errors  
**Stylus not recognized?** → Check browser support and console errors

## 📝 License

MIT
