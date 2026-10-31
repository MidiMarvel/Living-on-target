LIVING ON TARGET APP - upload steps
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

WHAT'S NEW IN VERSION 14 (app version 5.0): APPROVED VIDEOS FROM DROPBOX
The Tell your Story page now shows a "Watch approved videos" grid. It lists every video in the Dropbox folder
"/LOT App Video Uploads/Approved" and plays it in a full-screen player. To approve a video, drag it into that folder.
New function: netlify/functions/approved.mjs (the folder now holds SIX function files).

ONE-TIME DROPBOX SETUP
1. Go to https://www.dropbox.com/developers/apps and click Create app. Choose Scoped access, then Full Dropbox. Give it any unique name.
2. On the Permissions tab tick files.metadata.read and files.content.read, then click Submit. (Do this BEFORE step 4.)
3. On the Settings tab copy the App key and the App secret.
4. In your browser open this address, replacing APP_KEY with your App key:
   https://www.dropbox.com/oauth2/authorize?client_id=APP_KEY&response_type=code&token_access_type=offline
   Click Allow and copy the code Dropbox shows.
5. In the Mac Terminal run this (replace CODE, APP_KEY and APP_SECRET), then copy the "refresh_token" value from the reply:
   curl https://api.dropbox.com/oauth2/token -d code=CODE -d grant_type=authorization_code -u APP_KEY:APP_SECRET
6. In Netlify, Project configuration, Environment variables, add (mark all three secret):
   DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN
   Optional: DROPBOX_APPROVED_PATH if the folder is not /LOT App Video Uploads/Approved
7. Deploys, Trigger deploy, Deploy site. Then open https://living-on-target-app.netlify.app/api/approved
   It should show "configured":true and list your videos.
