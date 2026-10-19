# Reviewing and publishing UI changes

Repository owner and required code reviewer: **@JehanzaibKhattak**.

1. Jessie works on a feature branch (for example `ui/header-refresh`) and opens a pull request targeting `main`.
2. Include desktop/mobile screenshots and a description of the changed flows.
3. The `Validate frontend` check runs lint, a preview production build, TypeScript and the unit/integration suite. It uses a disposable SQLite database and receives no production secrets or deployment credentials.
4. The repository owner reviews the diff and screenshots, requests changes or approves, then merges. New commits dismiss stale approvals; conversations must be resolved and checks current.
5. Publishing to DigitalOcean is a separate, manual owner-operated SSH release. Approving or merging a pull request does not update peptbay.com. Record the approved Git commit when scheduling that release and verify the relevant desktop/mobile flows afterward.

## Access

Jessie needs only repository write access to submit branches and pull requests. Do not grant repository admin access or server SSH credentials for UI editing. Invite the confirmed GitHub username from Settings → Collaborators.

The `main` branch requires a code-owner review and the frontend check; force pushes and deletion are blocked. The owner retains GitHub's administrator bypass for emergency maintenance and remains responsible for any use of it. Normal contributor changes must use pull requests.

- Pull requests: https://github.com/JehanzaibKhattak/nordic-peptide/pulls
- Check runs: https://github.com/JehanzaibKhattak/nordic-peptide/actions/workflows/frontend-checks.yml
- Branch protection: https://github.com/JehanzaibKhattak/nordic-peptide/settings/branches

No automatic production deployment or GitHub-held server credential is configured. Existing DigitalOcean access remains with the authorized operator. Live payments and bank transfers retain their existing activation gates.
