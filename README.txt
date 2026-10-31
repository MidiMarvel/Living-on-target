LIVING ON TARGET APP - v6 upload steps
1. GitHub repo MidiMarvel/Living-on-target > Add file > Upload files.
   Drag in everything inside this folder (including the "netlify" folder). Commit.
   The netlify/functions folder should then hold: coach.mjs, group.mjs, cleanup.mjs, appfaq.mjs.
2. Netlify email notifications (Project configuration > Notifications > Form submission notifications):
   brad@steelecreek.org for forms "answers" and "facilitator".
3. Check: https://living-on-target-app.netlify.app/api/group should show {"ok":true,"storage":"working"}
4. In the app, Resources > Settings and start over shows the app version (should be 4.2).
5. Videos: edit videos.json on GitHub to add approved videos (title, by, note, url).
