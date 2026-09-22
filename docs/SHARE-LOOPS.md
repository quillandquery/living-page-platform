# Share loops — automatic moving share assets

Every published story gets a pre-generated ~2.5s loop (MP4 + animated WebP)
at 1080×1920, rendered from the *same* `<ShareFrame>` that draws the still,
stored in Supabase Storage, and offered in the reader's Instagram share
sheet ("Save moving version"). Stills remain the fallback.

## How it runs

```
publish/edit a story
        │  Supabase Database Webhook (stories INSERT/UPDATE)
        ▼
POST /api/on-publish        (thin adapter, on Vercel)
        │  repository_dispatch: story-published { id }
        ▼
GitHub Action share-loops.yml  (has ffmpeg)
        │  node scripts/gen-share-loops.ts --id <id>
        ▼
render frames (satori) → mp4+webp (ffmpeg)
        │  upload
        ▼
Supabase Storage bucket `share-loops`  +  stories.art_direction.share = { loopMp4, loopWebp, rev }
```

Belt-and-braces: the Action also runs on a 30-min **schedule** (`--missing`,
regenerates anything without a current loop) and on **manual dispatch**
(`mode: missing | all`) for the initial backfill.

## One-time setup

1. **GitHub secrets** (repo → Settings → Secrets → Actions):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`  (Storage upload + row update; server-only)
2. **Backfill the existing stories**: Actions → "Share loops" → Run workflow →
   mode `all`. (Creates the public `share-loops` bucket if missing.)
3. **Instant-on-publish** (optional but recommended):
   - Vercel env: `SHARE_WEBHOOK_SECRET` (any random string), `GH_REPO`
     ("owner/repo"), `GH_DISPATCH_TOKEN` (fine-grained PAT with
     *Contents: read and write* on this repo, or a classic token with `repo`).
   - Supabase → Database → Webhooks → Create:
     - Table `stories`, events **Insert + Update**
     - Type **HTTP Request**, method **POST**,
       URL `https://<your-site>/api/on-publish`
     - HTTP header `x-webhook-secret: <SHARE_WEBHOOK_SECRET>`

Without step 3 you still get every story within ~30 min via the schedule;
with it, within ~1–2 min of publishing.

## Local / manual

```
npm run gen:loops -- --fixture         # sample → public/share-loops (no DB)
npm run gen:loops -- --id <storyId>    # one story
npm run gen:loops -- @handle slug      # one story by address
npm run gen:loops -- --missing         # every published story lacking a loop
npm run gen:loops -- --all --force     # re-render everything
```
(`npm run gen:loops` reads `.env.local`; needs `ffmpeg` on PATH.)
