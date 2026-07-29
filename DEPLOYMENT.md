# Publishing this project

Two separate things: (1) put the code on GitHub as open source, (2) deploy
the running site to your domain. Do them in that order — Vercel/Netlify
both deploy straight from a GitHub repo, so step 1 makes step 2 trivial.

---

## 1. Push to GitHub

```bash
cd graphing-calculator
git init
git add .
git commit -m "Initial commit"
```

Create the repo (pick one):

**Via GitHub CLI** (`gh`, if installed):
```bash
gh repo create plotly-calculator --public --source=. --remote=origin --push
```

**Via the website:**
1. Go to https://github.com/new — name it, set it **Public**, don't
   initialize with a README/license (you already have both).
2. Then:
   ```bash
   git remote add origin https://github.com/<your-username>/plotly-calculator.git
   git branch -M main
   git push -u origin main
   ```

`node_modules` and `.next` are already excluded via `.gitignore`, so the
push stays small.

### Making it a good open-source repo
- **LICENSE** — already included (MIT: anyone can use/modify/sell it,
  they just keep the copyright notice). Swap it for another license
  before pushing if you'd rather use Apache-2.0 or GPL.
- **Repo settings → About** — add a description and topics (`nextjs`,
  `typescript`, `graphing-calculator`, `desmos-alternative`) so it's
  discoverable.
- Update `config/socials.ts`'s `github` field to the real repo URL once
  it exists, so the app's own footer/links point to the right place.
- Optional but common for open-source repos: enable **Issues** and
  **Discussions** in Settings, and add a one-paragraph "Contributing"
  section to the README if you want outside PRs.

---

## 2. Deploy to your domain

### Easiest path: Vercel (built by the Next.js team, zero config)

1. Go to https://vercel.com → sign in with GitHub → **Add New → Project**.
2. Select the `plotly-calculator` repo. Vercel auto-detects Next.js —
   leave the build settings as default (`next build`) and click **Deploy**.
3. You'll get a live `https://plotly-calculator-xxxx.vercel.app` URL
   within a minute or two.
4. **Connect your domain:** Project → **Settings → Domains** → enter
   your domain (e.g. `graphs.yourdomain.com` or the bare `yourdomain.com`)
   → **Add**.
5. Vercel shows you the exact DNS record to create. Usually:
   - Subdomain (`graphs.yourdomain.com`): add a **CNAME** record pointing
     to `cname.vercel-dns.com`.
   - Root/apex domain (`yourdomain.com`): add an **A** record pointing to
     `76.76.21.21` (Vercel shows the current value on the Domains page —
     use whatever it displays, in case it's changed).
6. Add these records in your domain registrar's DNS panel (wherever you
   bought the domain — Namecheap, GoDaddy, Cloudflare, Google Domains,
   etc.). Propagation is usually minutes, sometimes up to ~24h.
7. SSL (https) is issued automatically once DNS resolves — nothing else
   to configure.

From then on, **every `git push` to `main` auto-deploys** — that's the
whole workflow going forward.

### Alternatives (also zero-cost for a project this size)

**Netlify**
1. https://netlify.com → **Add new site → Import an existing project** →
   pick the GitHub repo.
2. Build command: `next build`. Netlify's Next.js runtime handles the
   rest automatically.
3. **Domain settings → Add custom domain**, then point your registrar's
   DNS at the nameservers or CNAME Netlify shows you.

**Cloudflare Pages**
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect
   to Git** → pick the repo.
2. Framework preset: **Next.js**. Build command `next build`, output
   directory is handled by the preset.
3. If your domain's nameservers are already on Cloudflare, adding the
   custom domain in Pages settings is one click and DNS is instant.

**Self-hosted (your own server/VPS)**
```bash
npm run build
npm run start   # serves on port 3000 by default
```
Put a reverse proxy (Caddy or nginx) in front for the domain + SSL.
Caddy is the simplest — a two-line Caddyfile gets you automatic HTTPS:
```
yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## Recommended order for you specifically

Since you have a domain already and just want it live:
**GitHub → Vercel → add domain in Vercel → update DNS at your
registrar.** That's the fewest steps and free for a project this size.
