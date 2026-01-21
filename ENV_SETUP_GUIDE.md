# Environment Variables Setup Guide

This document provides step-by-step instructions for obtaining all required environment variables for the Whiteboard application.

## Required Environment Variables

You need to set these environment variables both locally (in `.env` file) and in Vercel:

1. `GOOGLE_CLIENT_ID` - From Google Cloud Console
2. `SUPABASE_URL` - From Supabase project
3. `SUPABASE_KEY` - From Supabase project (anon/public key)
4. `JWT_SECRET` - Any random string (generate your own)

---

## 1. Google OAuth Setup

### Why you need this:
The "Access blocked: Authorisation error" happens because you're using a hardcoded Client ID from the demo. You need your own Google OAuth credentials.

### Steps:

#### A. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "NEW PROJECT"
3. Enter project name (e.g., "Whiteboard App")
4. Click "CREATE"

#### B. Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Click "CREATE"
4. Fill in the required fields:
   - **App name**: "Whiteboard App" (or your preferred name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "SAVE AND CONTINUE"
6. Skip "Scopes" section (click "SAVE AND CONTINUE")
7. Skip "Test users" section (click "SAVE AND CONTINUE")
8. Click "BACK TO DASHBOARD"

#### C. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click "+ CREATE CREDENTIALS" → "OAuth client ID"
3. Choose **Application type**: "Web application"
4. **Name**: "Whiteboard Web Client"
5. Under **Authorized JavaScript origins**, click "+ ADD URI" and add:
   - `http://localhost:3000` (for local testing)
   - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - You can add more later if needed
6. Click "CREATE"
7. **Copy the Client ID** - it looks like: `123456789-abcdefg.apps.googleusercontent.com`

#### D. Update Your Code

After creating credentials, you must update **TWO places**:

1. **Backend** - Set environment variable `GOOGLE_CLIENT_ID` (see Vercel setup below)
2. **Frontend** - Update `index.html` line 597:
   ```javascript
   client_id: 'YOUR_ACTUAL_CLIENT_ID_HERE',
   ```

---

## 2. Supabase Setup

### Steps:

#### A. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New project"
4. Fill in:
   - **Name**: "whiteboard-app"
   - **Database Password**: (generate a strong password - save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" (wait 2-3 minutes for setup)

#### B. Create Database Table

1. Once project is ready, click **SQL Editor** in left sidebar
2. Click "New query"
3. Copy and paste the contents of `supabase-setup.sql` from this repo
4. Click "Run" or press Ctrl+Enter
5. You should see "Success. No rows returned"

#### C. Get Supabase Credentials

1. Click **Settings** (gear icon) in left sidebar
2. Click **API** section
3. Copy these values:

   **SUPABASE_URL**:
   - Find "Project URL" 
   - Example: `https://abcdefghijklmnop.supabase.co`

   **SUPABASE_KEY** (anon/public):
   - Find "Project API keys" section
   - Copy the `anon` `public` key (NOT the `service_role` key)
   - It's a long string starting with `eyJ...`

---

## 3. JWT Secret

### Steps:

Generate a random secret string. You can use any of these methods:

**Option 1: Online generator**
- Go to https://randomkeygen.com/
- Copy any "CodeIgniter Encryption Keys" value

**Option 2: Command line (if you have Node.js)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 3: Simple random string**
- Just type a random string of letters and numbers (at least 32 characters)
- Example: `mySecretKey123XYZ789abcDEF456`

---

## 4. Setting Environment Variables in Vercel

### Steps:

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your whiteboard project
3. Click **Settings** tab
4. Click **Environment Variables** in left sidebar
5. Add each variable:

   **Variable 1:**
   - Key: `GOOGLE_CLIENT_ID`
   - Value: Your Client ID from Google Cloud (step 1C)
   - Environment: Select all (Production, Preview, Development)
   - Click "Save"

   **Variable 2:**
   - Key: `SUPABASE_URL`
   - Value: Your Supabase URL from step 2C
   - Environment: Select all
   - Click "Save"

   **Variable 3:**
   - Key: `SUPABASE_KEY`
   - Value: Your Supabase anon key from step 2C
   - Environment: Select all
   - Click "Save"

   **Variable 4:**
   - Key: `JWT_SECRET`
   - Value: Your generated secret from step 3
   - Environment: Select all
   - Click "Save"

6. **Important**: After adding variables, redeploy your app:
   - Go to **Deployments** tab
   - Click the three dots on latest deployment
   - Click "Redeploy"

---

## 5. Local Development (.env file)

For local testing, create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_KEY=your-actual-anon-key-here
JWT_SECRET=your-actual-secret-here
```

**Note**: Never commit the `.env` file to Git (it's already in `.gitignore`)

---

## Troubleshooting

### "Failed to load resource: the server responded with a status of 404 ()"
- **Cause**: API endpoints not deployed correctly to Vercel or deployment not yet propagated
- **Fix**: 
  1. Make sure you've committed and pushed all files including the `api/` folder
  2. Go to Vercel dashboard → Your project
  3. Check the **Deployments** tab - make sure latest deployment shows "Ready"
  4. Click on the deployment to see the build logs
  5. Verify that the `api/` folder files are included in the deployment
  6. If files are missing, redeploy:
     - Go to **Deployments** tab
     - Click three dots on latest deployment → **Redeploy**
  7. Wait for deployment to complete (usually 1-2 minutes)
  8. Clear browser cache and try again (Ctrl+F5 or Cmd+Shift+R)
  
  **Note**: After redeploying, it may take a few minutes for the API endpoints to become available.

### "Cross-Origin-Opener-Policy policy would block the window.postMessage call"
- **Cause**: These are warnings from Google's OAuth popup window, not errors from your app
- **Effect**: These warnings are harmless and don't prevent sign-in from working
- **Fix**: No fix needed - this is expected behavior from Google's OAuth library
- If sign-in still fails, the issue is likely one of the other errors listed here

### "Google Sign-in button disappeared"
- **Cause**: Old authentication tokens stored in browser's localStorage
- **Fix**: 
  1. Open browser DevTools (F12 or Right-click → Inspect)
  2. Go to Console tab
  3. Type: `localStorage.clear()` and press Enter
  4. Refresh the page (F5)
  5. The sign-in button should reappear
  
  **Alternative Method:**
  - In DevTools, go to Application tab (Chrome) or Storage tab (Firefox)
  - Find "Local Storage" in the left sidebar
  - Click on your site's URL
  - Right-click and select "Clear" or delete individual items
  - Refresh the page

### "Console is empty / No errors showing"
- **Cause**: Console might have been cleared or filters are active
- **Fix**:
  1. Open browser DevTools (F12)
  2. Go to Console tab
  3. Check if any filters are active (should show "All levels")
  4. Refresh the page and watch for messages like:
     - "initGoogleAuth called"
     - "Google Sign-In button rendered successfully"
  5. If you see "User is signed in, hiding sign-in button", clear localStorage (see above)

### "The given origin is not allowed for the given client ID"
- **Cause**: Your Vercel deployment URL is not added to Google OAuth authorized origins
- **Fix**: 
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Navigate to **APIs & Services** → **Credentials**
  3. Click on your OAuth 2.0 Client ID
  4. Under **Authorized JavaScript origins**, click **+ ADD URI**
  5. Add your exact Vercel URL (e.g., `https://your-app.vercel.app`)
  6. **Important**: Do NOT include `/api` or any path - just the domain
  7. Click "SAVE"
  8. Wait 5 minutes for changes to propagate
  9. Clear localStorage and refresh the page

### "Access blocked: Authorisation error"
- **Cause**: Using the hardcoded demo Client ID or your authorized origins don't match
- **Fix**: 
  1. Create your own Google OAuth credentials (see step 1)
  2. Update `index.html` line 597 with YOUR Client ID
  3. Make sure your Vercel URL is added to "Authorized JavaScript origins"
  4. Redeploy after updating

### "Failed to load resource: the server responded with a status of 404 ()"
- **Cause**: API endpoints not deployed correctly to Vercel
- **Fix**: 
  1. Make sure all environment variables are set in Vercel (see step 4)
  2. Redeploy the app in Vercel
  3. Check Vercel deployment logs for any errors

### "Failed to save drawing"
- **Cause**: Supabase credentials missing or incorrect
- **Fix**: Double-check `SUPABASE_URL` and `SUPABASE_KEY` in Vercel settings

### "Authentication failed"
- **Cause**: `GOOGLE_CLIENT_ID` environment variable not set in Vercel
- **Fix**: Add the variable in Vercel settings (step 4) and redeploy

---

## Quick Checklist

- [ ] Created Google Cloud project
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Updated `index.html` line 597 with YOUR Client ID
- [ ] Added your Vercel URL to Authorized JavaScript origins
- [ ] Created Supabase project
- [ ] Ran `supabase-setup.sql` in Supabase SQL editor
- [ ] Copied Supabase URL and anon key
- [ ] Generated JWT secret
- [ ] Added all 4 environment variables to Vercel
- [ ] Redeployed Vercel app after adding variables
- [ ] Tested sign-in on deployed app

---

## Summary of Values Needed for Vercel

| Variable Name | Where to Get It | Example Format |
|--------------|----------------|----------------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials | `123-abc.apps.googleusercontent.com` |
| `SUPABASE_URL` | Supabase Settings → API → Project URL | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | Supabase Settings → API → anon public key | `eyJhbGc...` (long string) |
| `JWT_SECRET` | Generate your own random string | Any 32+ character string |
