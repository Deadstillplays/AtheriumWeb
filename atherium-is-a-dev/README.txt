ATHERIUM.IS-A.DEV SETUP
=======================

1) Register the domain (is-a.dev repo)
   - Fork https://github.com/is-a-dev/register
   - Copy domains/atherium.json into the "domains" folder of your fork
   - Put your REAL email in the "email" field
   - Open a pull request and wait for it to be merged (write the PR text yourself)

2) Point GitHub Pages at it (your website repo)
   - Put the CNAME file in the ROOT of the repo that holds index.html
     (next to index.html, style.css, github-sync.js)
   - Repo Settings -> Pages -> Custom domain: atherium.is-a.dev
   - Tick "Enforce HTTPS" once the DNS check passes

Notes
   - The CNAME target (deadstillplays.github.io) is your GitHub Pages host.
   - Check the field names against the current docs at https://docs.is-a.dev
     in case the schema changed.
