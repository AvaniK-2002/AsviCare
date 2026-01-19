<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/2

## Run Locally

**Prerequisites:** Node.js, Supabase account

1. Install dependencies:
   `npm install`

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API in your Supabase dashboard
   - Copy your Project URL and anon/public key

3. **Configure environment variables in [.env.local](.env.local):**
   - Set `GEMINI_API_KEY` to your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Set `VITE_SUPABASE_URL` to your Supabase Project URL
   - Set `VITE_SUPABASE_ANON_KEY` to your Supabase anon/public key

4. **Configure Supabase Auth (optional but recommended):**
   - In your Supabase dashboard, go to Authentication > Settings
   - Configure email templates and settings as needed
   - Enable email confirmation if desired

5. Run the app:
   `npm run dev`
