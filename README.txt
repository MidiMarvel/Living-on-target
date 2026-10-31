LIVING ON TARGET APP - v9 upload steps
1. GitHub repo MidiMarvel/Living-on-target > Add file > Upload files.
   Drag in everything inside this folder (including the "netlify" folder). Commit.
   The netlify/functions folder should then hold: coach.mjs, group.mjs, cleanup.mjs, appfaq.mjs.
2. Netlify email notifications (Project configuration > Notifications > Form submission notifications):
   brad@steelecreek.org for forms "answers" and "facilitator".
3. Check: https://living-on-target-app.netlify.app/api/group should show {"ok":true,"storage":"working"}
4. In the app, Resources > Settings and start over shows the app version (should be 4.5).
5. Videos: edit videos.json on GitHub to add approved videos (title, by, note, url).


EMAIL TO THE FACILITATOR (v10)
The function netlify/functions/notify.mjs emails brad@steelecreek.org through Resend (free). Add the environment variable RESEND_API_KEY in Netlify (Project configuration, Environment variables), mark it secret, then redeploy. Check it at https://living-on-target-app.netlify.app/api/notify (should show emailConfigured true). Netlify Forms still stores a backup copy of every submission.

LANGUAGES (v11)
A globe button at the top (EN / ES / FR) switches the whole app, including the training text. All translations are in the index.html file. They were written by an AI and should be read over by a native Spanish and French speaker before wide use; corrections can be sent to Claude to apply.

WHAT'S NEW IN VERSION 13
- Wider layout on computers (windows 900px or wider); phones unchanged.
- Home page redesigned: "Learn about this app" at top, "Continue where you left off" first, green left band on completed sections, facilitator and group-chat buttons removed (all communication is in the Chat menu).
- Content menu: bold titles, a checkbox per section that turns green on "Complete this section", Bookmarks entry removed.
- End of each questions page: Submit to facilitator, Share with someone (group = posts to the section chat; alone = opens your email app), Complete this section.
- Resources menu reordered; new Living On Target Network page; Download completed workbook shortcut.
- Bookmarks page has Home / Tell Your Story / Check Progress shortcuts; new Check Progress page.
- Upload the whole contents of this folder (including the netlify folder) as before.
