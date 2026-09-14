#!/usr/bin/env bash
# Server-side deploy job for sched.xeed.ink — started by scripts/server/webhook.mjs
# (or manually: ssh gx, then `runuser -u sched-ci -- bash ~/schedmate/scripts/server/deploy.sh`).
#
#   1. shallow-fetch the pushed branch into the persistent clone
#   2. bun install + vite build
#   3. rsync to /srv/sched (Caddy serves it); hashed /assets/ retire into
#      ~/sched-attic for ~7d (outlives the 5d shell TTL set in Caddy)
set -Eeuo pipefail
umask 022

REF="${1:-refs/heads/main}"
BRANCH="${REF#refs/heads/}"
REPO=/home/sched-ci/schedmate   # on the gx VPS (1.14.133.242)
DEST=/srv/sched
LOCK=/home/sched-ci/.deploy.lock
RERUN=/home/sched-ci/.deploy-rerun

say() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { say "FATAL: $*"; exit 1; }

cd "$REPO"

# One deploy at a time; a push that lands mid-deploy queues exactly one rerun
# (latest commit wins — the queued rerun fetches the newest sha anyway).
exec 9>"$LOCK"
if ! flock -n 9; then
  touch "$RERUN"
  say "deploy already running — queued one rerun"
  exit 0
fi

say "=== deploy start (${BRANCH}, sha=${SC_PUSH_SHA:-unknown}) ==="

# Snapshot the running script BEFORE the fetch: bash keeps executing the old
# inode across the checkout, but $0 is just a path and resolves to the new
# file afterwards — path-to-path comparison can never detect the change.
SELF_SNAP=$(mktemp)
cat "$0" > "$SELF_SNAP"

git fetch --depth=1 origin "$BRANCH"
git checkout -q -B "$BRANCH" FETCH_HEAD
# untracked caches (node_modules) survive on purpose

# We were spawned from the pre-fetch checkout; if deploy.sh itself changed,
# re-exec so the new revision's logic publishes this push. After the re-exec
# the snapshot equals the file, so this fires at most once.
if ! cmp -s "$SELF_SNAP" "$REPO/scripts/server/deploy.sh"; then
  rm -f "$SELF_SNAP"
  say "deploy.sh changed in ${BRANCH} — re-execing from new checkout"
  exec /bin/bash "$REPO/scripts/server/deploy.sh" "$@"
fi
rm -f "$SELF_SNAP"

# --- frontend build + publish ----------------------------------------------
bun install
bun run build

printf '{"sha":"%s","branch":"%s","deployedAt":"%s"}\n' \
  "$(git rev-parse HEAD)" "$BRANCH" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > dist/deploy-meta.json

# index.html (shell) replaces wholesale. Hashed UI chunks retire into a
# timestamped attic instead of being deleted: a shell cached for 5d may still
# reference them (max-age set in the Caddy block — keep TTL < retention when
# changing either side). Attic dirs are pruned by their own age, i.e. measured
# from retirement, independent of deploy cadence.
# $HOME (not /srv) — web-served tree + ReadWritePaths=…/srv/sched only.
ATTIC="$HOME/sched-attic"
mkdir -p "$ATTIC"
rsync -a --delete --delay-updates --exclude=/assets \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/ "$DEST/"
# --checksum: dist mtimes are always fresh, so quick-check would rewrite (and
# thus --backup) every file each deploy; content comparison makes the attic
# hold only genuinely retired assets.
rsync -a --delete --checksum --backup --backup-dir="$ATTIC/$(date -u +%Y%m%dT%H%M%S)" \
  --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  dist/assets/ "$DEST/assets/"
# GNU find rounds age up: +6 = 7 full days = 5d shell TTL + 2d margin.
find "$ATTIC" -mindepth 1 -maxdepth 1 -type d -mtime +6 -exec rm -rf {} +
say "published $(git rev-parse --short HEAD) → $DEST (attic: $(du -sh "$ATTIC" 2>/dev/null | cut -f1))"

say "=== deploy done ==="
if [ -e "$RERUN" ]; then
  rm -f "$RERUN"
  say "a newer push arrived during this deploy — running again"
  exec /bin/bash "$0" "$REF"
fi
