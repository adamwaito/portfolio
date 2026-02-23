# PocketBase Setup Guide

## Quick Start

### 1. Start PocketBase
```bash
cd /Users/adamwaito/Documents/web/projects/portfolio2
./pocketbase_0.36.3_darwin_arm64/pocketbase serve
```

This will print:
- **Admin UI**: `http://127.0.0.1:8090/_/`
- **API**: `http://127.0.0.1:8090/api`

### 2. Log in to Admin UI
1) Open http://127.0.0.1:8090/_/ 
2) Create an admin account (username + password)

### 3. Create `projects` Collection
In Admin UI:
1) Click **Collections** → **Create new**
2) Name: `projects` (type: **Base**)
3) Add these fields:

| Field Name | Type | Required | Notes |
|---|---|---|---|
| `title` | Text | Yes | Project title |
| `short_description` | Text | No | Grid card text |
| `description` | Text | No | Modal description |
| `categories` | Text | No | Space-separated (e.g. "animation layout") |
| `thumbnail` | File | No | Single image |
| `gallery` | Files | No | Images and videos (images: jpg, png, webp; videos: mp4, webm, mov, avi, mkv) |
| `gallery_captions` | Text | No | Captions for gallery images (one per line) |

4) Save collection

### 4. Run Migration Script
Once the collection exists, run:
```bash
node migrate_to_pocketbase.js
```

This will:
- Read all projects from `content/projects/*.md`
- Import them into PocketBase
- Upload images to PocketBase file storage

### 5. Verify in Admin UI
- Go to **Collections** → **projects**
- Check that all projects + images are there

### 6. Test Frontend
1) Restart your dev server (if running)
2) Visit http://localhost:3000
3) Projects should load from PocketBase instead of GitHub

---

## Important Notes

- **Local only**: PocketBase runs on your machine. The live site (Netlify) can't reach it.
- **To go live**: Host PocketBase on a VPS (DigitalOcean, Heroku, Railway, etc.) and update the API URL in [js/main.js](js/main.js)
- **Data**: PocketBase stores projects in a SQLite database (`pb_data/`), not in the Git repo.

---

## Troubleshooting

**"Collection doesn't exist"** when running migration:
- Make sure `projects` collection is created in Admin UI first.

**"Can't connect to PocketBase"** in frontend:
- Check that `./pocketbase serve` is running in another terminal.
- Verify API URL in [js/main.js](js/main.js) matches your PocketBase URL.

**Images not uploading**:
- Check file sizes (max ~10 MB per file by default).
- Ensure `images/uploads/` folder has the files.
