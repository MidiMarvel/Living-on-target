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

WHAT'S NEW IN VERSION 15 (app version 5.1)
- Home page overview under the title (English, Spanish, French).
- Section 4 (Loving and Serving): gray icon strip under the title, the strip again under "2) The Four Foundations", and one gray icon under each foundation heading. New files: icon-grp.png, icon-christ.png, icon-home.png, icon-church.png, icon-world.png.
- Section 4 page breaks: the two parts and each foundation start at the top of a page.
- The green "section complete" band is now wider (16px) and easier to see.

VERSION 18 (Dropbox: finds the folder by searching for its name; app itself unchanged)
- If the default path is not found, approved.mjs searches Dropbox for a folder named like the parent in DROPBOX_APPROVED_PATH and remembers where it was found.
- /api/approved?diag=1 (only while DROPBOX_DIAG=1) now pages through the full list and shows where the folder was found.

VERSION 17 (Dropbox folder search, app itself unchanged)
- approved.mjs also searches each top-level Dropbox folder (for example "Brad's Dropbox") for the Approved folder and remembers where it was.
- Troubleshooting only: set DROPBOX_DIAG=1 in Netlify, redeploy, then open /api/approved?diag=1 to see top-level folder names. Remove the variable afterwards.

VERSION 16 (Dropbox fix, app itself unchanged)
- netlify/functions/approved.mjs now finds the Approved folder on Dropbox team accounts, where your files live in a
  "home" space. If the first lookup says path/not_found it asks Dropbox for the home space and retries.
- Only the DROPBOX_APPROVED_PATH variable is needed if your folder is somewhere other than "/LOT App Video Uploads/Approved"
  inside your own Dropbox space. Do not include "Brad's Dropbox" in the path.


v19: Tell your Story page now shows the Vimeo showcase "LOT Videos" (https://vimeo.com/showcase/12478213) above the Dropbox approved videos. Only index.html and sw.js changed. To change the showcase later, ask Claude to swap the number 12478213.


v20: four-icon strip moved above the Section 4 title and added to the home page (above the overview text); second strip under "The Four Foundations" removed; each Foundation icon now sits left of its heading; header and home title now read "Module: Discipleship Lifestyle Training" with Module in the logo orange. Changed: index.html and sw.js.


v21: "Tell your Story" renamed "God Story Theater" (menu, page title, bookmarks, help text); showcase heading is now "See what’s happening". Changed: index.html, sw.js, netlify/functions/appfaq.mjs.


v22: New Home menu (first button in the top bar) replaces the Chat menu: Home page, On my own or with a group, group threads and Who is here, Start from the beginning, Start over completely. Message the facilitator moved to Resources. Content menu: "Pick up where I left off" at the top, Home entry removed, Questions lines indented with their own check mark (green when all answered) and a rose bar that fills as questions are answered. All dropdown text is bold. Header "Module: Discipleship Lifestyle Training" is one line (shrinks to fit in Spanish and French). Broken sentences from the PDF rejoined in Sections 3 and the Wrap-up (EN/ES/FR) and paragraphs balanced to avoid single dangling words. Question hints: new "Back to my question" button; the phone keyboard is closed before jumping so pages no longer lay out wrongly. Changed: index.html, sw.js, netlify/functions/appfaq.mjs, README.txt.
