# Whiteboard Application

A collaborative whiteboard application with Google Sign-in and Supabase storage.

## Features

- Google Authentication
- Drawing tools (pen, eraser, shapes)
- Save drawings to Supabase
- Load and list drawings per user account

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a [Supabase](https://supabase.com) account
2. Create a new project
3. In the SQL Editor, run the SQL script from `supabase-setup.sql` or copy and paste the following:

```sql
-- Create drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  drawing_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_drawings_user_id ON drawings(user_id);
CREATE INDEX IF NOT EXISTS idx_drawings_created_at ON drawings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for authenticated API requests
CREATE POLICY "Enable all operations for authenticated users"
  ON drawings FOR ALL
  USING (true)
  WITH CHECK (true);
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# JWT Secret (optional, for app-specific tokens)
JWT_SECRET=your-jwt-secret-key
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized JavaScript origins:
   - `http://localhost:3000` (for local development)
   - Your production domain
6. Copy the Client ID to your `.env` file and update `index.html` (line 595)

### 5. Deploy to Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` in the project directory
3. Add environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

## Project Structure

```
.
├── api/
│   ├── auth.js        # Google authentication endpoint
│   ├── drawings.js    # Drawing CRUD operations
│   └── index.js       # Express app setup
├── index.html         # Frontend application
├── package.json       # Dependencies
├── vercel.json        # Vercel configuration
└── .env.example       # Environment variables template
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Authenticate with Google
- `GET /api/auth/verify` - Verify JWT token

### Drawings
- `POST /api/drawings/save` - Save a drawing
- `GET /api/drawings/load/:drawingId` - Load a drawing
- `GET /api/drawings/list` - List all user drawings
- `DELETE /api/drawings/delete/:drawingId` - Delete a drawing

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Or use Vercel dev for local testing
vercel dev
```

## Security Considerations

For production deployment, consider adding:
- Rate limiting on authentication and API endpoints to prevent brute force attacks
- Additional input validation and sanitization
- CORS configuration to restrict allowed origins
- Environment-specific configuration for different deployment environments

## License

MIT
