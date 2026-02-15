#!/usr/bin/env node

/**
 * Migrate projects from Decap CMS markdown files to PocketBase
 * Usage: node migrate_to_pocketbase.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configuration
const POCKETBASE_URL = 'http://127.0.0.1:8090';
const ADMIN_EMAIL = 'your-admin-email@example.com'; // Update this
const ADMIN_PASSWORD = 'your-admin-password'; // Update this
const PROJECTS_DIR = path.join(__dirname, 'content/projects');
const IMAGES_DIR = path.join(__dirname, 'images/uploads');
const COLLECTION_NAME = 'projects';

let authToken = null;

// Parse YAML frontmatter
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { data: {}, content };

  const frontmatter = match[1];
  const data = {};
  let currentListKey = null;

  frontmatter.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('-')) {
      if (!currentListKey) return;
      const item = trimmed.replace(/^-\s*/, '');
      data[currentListKey] = data[currentListKey] || [];
      data[currentListKey].push(item);
      return;
    }

    const [key, ...valueParts] = line.split(':');
    const rawValue = valueParts.join(':').trim();

    if (rawValue === '') {
      currentListKey = key.trim();
      data[currentListKey] = data[currentListKey] || [];
      return;
    }

    let value = rawValue;
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    data[key.trim()] = value;
    currentListKey = null;
  });

  return { data, content: content.replace(match[0], '').trim() };
}

// Authenticate with PocketBase
async function authenticate() {
  console.log('Authenticating with PocketBase...');
  const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });

  if (!response.ok) {
    console.error('Authentication failed. Make sure:');
    console.error('1. PocketBase is running on http://127.0.0.1:8090');
    console.error('2. Admin account exists');
    console.error('3. Email and password in this script match the admin account');
    process.exit(1);
  }

  const data = await response.json();
  authToken = data.token;
  console.log('✓ Authenticated\n');
}

// Upload a file and return its file ID
async function uploadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ File not found: ${filePath}`);
    return null;
  }

  const fileName = path.basename(filePath);
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  // Upload to a dummy record first to get the file name
  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/${COLLECTION_NAME}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        ...formData.getHeaders()
      },
      body: formData
    }
  );

  if (!response.ok) {
    console.warn(`  ⚠ Upload failed for ${fileName}`);
    return null;
  }

  console.log(`  ✓ Uploaded: ${fileName}`);
  return fileName;
}

// Create a project record in PocketBase
async function createProject(projectData) {
  const body = {
    title: projectData.title,
    short_description: projectData.short_description || '',
    description: projectData.description || '',
    categories: projectData.categories || '',
    thumbnail: projectData.thumbnail || '',
    gallery: projectData.gallery || []
  };

  const response = await fetch(
    `${POCKETBASE_URL}/api/collections/${COLLECTION_NAME}/records`,
    {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`  ✗ Failed to create project "${projectData.title}": ${error}`);
    return null;
  }

  const record = await response.json();
  console.log(`✓ Created: ${projectData.title}`);
  return record;
}

// Main migration function
async function migrate() {
  await authenticate();

  // Read all markdown files
  const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} project files\n`);

  for (const file of files) {
    const filePath = path.join(PROJECTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = parseFrontmatter(content);

    if (!data.title) {
      console.warn(`⚠ Skipping ${file} (no title)`);
      continue;
    }

    console.log(`\nProcessing: ${data.title}`);

    // Map image paths and fix them to be relative
    if (data.thumbnail) {
      data.thumbnail = path.basename(data.thumbnail);
    }

    if (Array.isArray(data.gallery)) {
      data.gallery = data.gallery.map(img => path.basename(img));
    }

    // Create the project
    await createProject(data);
  }

  console.log('\n✓ Migration complete!');
  console.log('\nNext steps:');
  console.log('1. Go to http://127.0.0.1:8090/_/ and verify projects are there');
  console.log('2. Upload thumbnail and gallery images via the Admin UI (drag & drop)');
  console.log('3. Update js/main.js to fetch from PocketBase');
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
