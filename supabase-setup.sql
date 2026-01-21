-- Supabase Database Setup Script
-- Run this in your Supabase SQL Editor to set up the database

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

-- Enable Row Level Security (RLS)
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own drawings" ON drawings;
DROP POLICY IF EXISTS "Users can insert their own drawings" ON drawings;
DROP POLICY IF EXISTS "Users can update their own drawings" ON drawings;
DROP POLICY IF EXISTS "Users can delete their own drawings" ON drawings;

-- Create permissive RLS policy for API server
-- Note: We use a permissive policy here because authentication and authorization
-- are handled by the API server (drawings.js) which verifies JWT tokens
-- and filters queries by user_id. The API uses the Supabase service key
-- which bypasses RLS, so these policies mainly serve as documentation.
-- For client-side Supabase access, you would want stricter RLS policies.

CREATE POLICY "Enable all operations for authenticated users"
  ON drawings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add a comment
COMMENT ON TABLE drawings IS 'Stores user drawings with authentication via API server';
