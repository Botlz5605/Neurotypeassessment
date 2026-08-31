# Neurobuild Assessment — Kronos Longevity & Performance

The 30-question quiz that sorts a lifter into one of three Neurobuild
types — **Challenger**, **Guardian**, or **Storm** — and hands off the
result to Kit for tagging and a follow-up sequence. Single static
HTML page plus one Netlify serverless function. No build step.

Live at: neurotypeassessment.netlify.app

## What's in this repo

```
index.html                        the whole quiz — markup, styles, and scoring logic
netlify/functions/subscribe.js    serverless function that talks to Kit
```

`index.html` is self-contained: 30 questions, an 11-trait scoring
engine, and the three Neurobuild type write-ups (training, nutrition,
recovery, stressors, strengths, watch-outs for each). The scoring
still runs on five internal buckets (1A/1B/2A/2B/3) under the hood —
that's the original diagnostic engine — and those get aggregated at
the end into the three public-facing types:

- **Challenger** = 1A + 1B (dopamine-dominant)
- **Guardian** = 2A + 2B (adrenaline / muscular-dominant)
- **Storm** = 3 (inhibitor-deficient)

After the last question, the quiz shows an email-capture screen, then
posts `{ email, firstName, type }` to `/.netlify/functions/subscribe`
before showing the result. That call is non-blocking — if Kit is down
or misconfigured, the visitor still sees their result.

## First-time setup

**1. Push this repo to GitHub**, if you haven't already:

```
git init
git add .
git commit -m "Initial Neurobuild quiz"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

**2. Connect it to the Netlify site.**
In the Netlify dashboard, open the `neurotypeassessment` site →
Site configuration → Build & deploy → Continuous deployment (or
"Link repository" if nothing's linked). Choose GitHub, authorize if
asked, select this repo. This keeps the existing live URL and just
switches where Netlify pulls the code from.

**3. Build settings.**
No build command — leave it blank. Publish directory is the repo
root (`/`). Netlify auto-detects `netlify/functions/` and deploys
`subscribe.js` as a function with no extra config.

**4. Set the Kit API key.**
Site configuration → Environment variables → add a variable:

| Key | Value |
|---|---|
| `KIT_API_SECRET` | your Kit v4 API secret key (Kit → Settings → Developer → API Keys) |

**5. Deploy.**
Deploys tab → Trigger deploy → Deploy site. After this, every push
to `main` auto-deploys.

**6. Test it.**
Run the quiz live, submit an email at the gate, confirm the result
renders. Check Kit — the subscriber should be tagged with their type
and sitting in the matching sequence. If the Kit call fails silently,
check Netlify → Functions → subscribe → logs for the error.

## Kit tag / sequence IDs

These are hardcoded in `subscribe.js` — update both places if you
ever recreate the tags or sequences in Kit:

| Type | Tag ID | Sequence ID |
|---|---|---|
| Challenger | 22914187 | 2878203 |
| Guardian | 22914188 | 2878204 |
| Storm | 22914189 | 2878205 |

## Known gaps / things to verify

- `subscribe.js` was written against general Kit v4 API conventions,
  not tested live. Before fully trusting it in production, check the
  endpoint paths (`/v4/subscribers`, `/v4/tags/{id}/subscribers`,
  `/v4/sequences/{id}/subscribers`) and the auth header name against
  [developers.kit.com](https://developers.kit.com).
- The three Kit sequences are empty shells right now — no welcome or
  nurture emails written yet for Challenger, Guardian, or Storm.

## Making changes later

- **Question wording / scoring** — edit the `QUESTIONS` array in
  `index.html`. Each option's `s` object scores the original five
  buckets; `tr` scores the 11 personality traits.
- **Type copy** (training, nutrition, mantra, etc.) — edit the
  `TYPES` object in `index.html`.
- **Styling** — all CSS is inline in `index.html`'s `<style>` block,
  using the existing Kronos design system (Outfit + Fraunces fonts,
  ink/accent color variables at the top).
