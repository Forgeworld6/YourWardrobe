# YourWardrobe

A responsive, installable wardrobe and outfit-planning starter app.

## Included
- Dashboard with wardrobe and saved-look counts
- Outfit Studio with image uploads for tops, bottoms and footwear
- Flat-lay preview
- Simple illustrative model layout (not AI virtual try-on)
- Product URL shortcuts
- Saved looks and wardrobe collection stored in this browser/device
- Light and dark themes
- Basic PWA manifest and service worker

## Important notes
- This is a frontend starter. It does not have accounts, cloud sync, a backend, or AI try-on.
- Uploaded images and saved looks are stored locally in the browser on the device where they were added.
- Product links are saved as shortcuts; the app does not automatically fetch product photos.
- For best performance, use reasonably sized images (under 8 MB each).

## Publish with GitHub Pages
1. Create a GitHub repository named `YourWardrobe`.
2. Extract this ZIP on your device.
3. Upload the **contents** of this folder to the repository root. `index.html` must be visible at the top level, not inside another nested folder.
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Choose branch `main` and folder `/ (root)`, then Save.
7. Wait for GitHub Pages to publish and open the website link shown on that page.

## Updating later
Edit the files in GitHub and commit the changes. GitHub Pages will publish the updated version automatically.

## Project files
- `index.html` — app structure
- `styles.css` — layout and styling
- `app.js` — app behavior and local storage
- `manifest.json` — installable app metadata
- `sw.js` — basic offline cache
- `assets/` — app icon files
