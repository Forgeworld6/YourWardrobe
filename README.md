# YourWardrobe

A monochrome, mobile-first wardrobe and outfit planner built with React, Vite and TypeScript.

## Included in this first version
- Outfit Studio with Top, Bottom and Shoes slots
- Add clothing using a photo upload or direct image URL
- Switchable flat-lay and stylised model preview
- Wardrobe collection with category filters
- Save and reopen outfit combinations
- Light mode by default and optional dark mode
- Local browser storage (data stays on this device/browser)
- Installable PWA configuration
- GitHub Actions deployment to GitHub Pages

## Important
This is the first working interface version. The mannequin-style/AI virtual try-on, user accounts, cloud sync and Firebase are not connected yet. The model view is a stylised visual preview, not an AI-generated photorealistic virtual try-on.

## GitHub Pages
The repository name is `YourWardrobe`, so `vite.config.ts` uses `base: '/YourWardrobe/'`.

1. Upload the project contents to the repository root (not the enclosing ZIP folder).
2. Commit to the `main` branch.
3. Open **Settings → Pages** and choose **GitHub Actions** as the build and deployment source.
4. Open **Actions** and wait for `Deploy YourWardrobe to GitHub Pages` to complete successfully.
5. Your site will be at `https://YOUR-GITHUB-USERNAME.github.io/YourWardrobe/`.

If your repository uses a branch other than `main`, change the branch in `.github/workflows/deploy.yml`.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
