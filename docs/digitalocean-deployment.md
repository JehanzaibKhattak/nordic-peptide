# GitHub → DigitalOcean deployment

GitHub is the source of truth. Production runs a standalone Next.js Docker image
on the DigitalOcean droplet with Podman and systemd. GitHub Actions validates
pushes/PRs; it does not automatically release production.

## Release sequence

1. Commit the intended changes, run lint/type/unit checks, and push the release
   branch to `JehanzaibKhattak/nordic-peptide` on GitHub.
2. Build the exact commit's Docker context on DigitalOcean with the approved
   production flags. Existing live flags are UK-only shipping, offline inventory,
   browse/demo checkout disabled, and Avion checkout enabled. Keep secrets in
   `/opt/avion/env/store.env`; do not bake them into the image or commit them.
3. If schema changes are part of that release, back up PostgreSQL and review/apply
   `npm run db:deploy:production`. Do not run seed or db push on production.
4. Run a temporary preview container with the existing private network/config and
   persistent upload volume, check product pages and protected routes, then back
   up the current unit/environment file. Change only the image tag in
   `/etc/containers/systemd/avion-store.container`, reload systemd and restart
   `avion-store.service`. Roll back the image/unit/config if health checks fail.
5. Verify public pages and the existing payment/worker timers. Record the source
   commit, image tag and rollback directory in the release report.

## Persistent product-image uploads

Set `PRODUCT_IMAGE_UPLOAD_DIR=/app/uploads` and mount
`/opt/avion/data/store-uploads:/app/uploads:z` in the store unit. The host directory
must be writable by UID/GID 1000 (the image's node user). Include it in server
backups; container/image replacements must never delete it. Do not expose the
host directory as a generic file browser.

Authenticated admin uploads retain the 4 MB PNG/JPEG/WebP/AVIF limit. Generated
UUID filenames are served through `/product-uploads/<filename>` with explicit
image content types, no MIME sniffing and immutable caching. Traversal and unknown
file extensions are rejected. There is no cloud-blob token or storage SDK.
Bundled client photography remains versioned in `public/products`.

## Old hosting integration

The only retained host-specific config is `vercel.json` with
`git.deploymentEnabled: false`, which blocks Git-triggered deployments:
https://vercel.com/docs/project-configuration/git-configuration
It is an opt-out, not a hosting dependency. Remove it only after the project owner
has disconnected the old project's GitHub integration. The connected account
could not access the old project, so its deletion/disconnection is not claimed.
Local project-link files were moved out of the repository; old external cloud
resources and billing are not deleted by removing repository configuration.

The repository's historical name/local folder may still contain the former host
name. Renaming them is not required to deploy to DigitalOcean.
