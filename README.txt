LIVING ON TARGET APP - v3 upload steps
1. GitHub repo MidiMarvel/Living-on-target > Add file > Upload files.
   Drag in the CONTENTS of this folder AND the "netlify" folder (it now has coach.mjs, group.mjs, cleanup.mjs). Commit.
   Netlify redeploys in about a minute.
2. Netlify > Project configuration > Notifications > Form submission notifications > Add email notification:
   brad@steelecreek.org, form "answers".
3. To show a video in the app: open videos.json in GitHub, click the pencil, add an entry, commit.
   { "title": "Mary shares her story", "by": "Mary", "note": "optional", "url": "SHARED LINK" }
   Dropbox: right-click the file > Share > Create link > "Anyone with the link" (view only), paste it as url.
   Vimeo and YouTube links work too.
