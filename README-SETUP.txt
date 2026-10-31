LIVING ON TARGET APP - SETUP (coach version)
Full steps are in the chat. Short version:
1. Unzip this folder.
2. Create a free GitHub account and a new repository; upload ALL the files and the netlify folder.
3. On Netlify: Add new project > Import from Git > pick the repository. Leave build settings as they are.
4. Add environment variable ANTHROPIC_API_KEY (from console.anthropic.com), then redeploy.
5. Open your site link in Safari on iPhone > Share > Add to Home Screen.
Optional environment variables: MODEL, DAILY_LIMIT_PER_PERSON (default 40), DAILY_LIMIT_TOTAL (default 1500).
