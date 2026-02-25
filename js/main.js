console.log('Portfolio loaded');

// PocketBase API URL (change to your hosted URL when migrating to production)
const POCKETBASE_URL = 'https://api.adamwaitoiscool.com';
const API_URL = `${POCKETBASE_URL}/api/collections/projects/records`;

function normalizeCategories(value) {
  if (!value) return '';
  return value
    .split(/[,\s]+/)
    .map(cat => cat.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

// Detect if a file is a video based on extension
function isVideoFile(filenameOrPath) {
  if (!filenameOrPath) return false;
  // Handle both strings and objects
  const filename = typeof filenameOrPath === 'string' ? filenameOrPath : (filenameOrPath.filename || filenameOrPath.src || '');
  if (!filename) return false;
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return videoExtensions.includes(ext);
}

// Parse YouTube/Vimeo URLs and return embed code
function parseVideoUrl(url) {
  // Try YouTube long form: youtube.com/watch?v=...
  let match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (match) {
    return {
      type: 'youtube',
      id: match[1],
      embed: `https://www.youtube.com/embed/${match[1]}`
    };
  }

  // Try YouTube short form: youtu.be/... (handles query params)
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return {
      type: 'youtube',
      id: match[1],
      embed: `https://www.youtube.com/embed/${match[1]}`
    };
  }

  // Try Vimeo
  match = url.match(/vimeo\.com\/(\d+)/);
  if (match) {
    return {
      type: 'vimeo',
      id: match[1],
      embed: `https://player.vimeo.com/video/${match[1]}`
    };
  }

  return null;
}

// Parse a limited YAML frontmatter shape used by this project.
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
      const [itemKey, ...itemValueParts] = item.split(':');
      const itemValue = itemValueParts.join(':').trim();

      data[currentListKey] = data[currentListKey] || [];
      if (itemValueParts.length === 0) {
        data[currentListKey].push(itemKey.trim());
      } else if (itemKey === 'image') {
        data[currentListKey].push(itemValue);
      }
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

async function loadCMSProjects() {
  try {
    // Fetch with sort by sort_order field (ascending)
    const response = await fetch(`${API_URL}?sort=sort_order`);
    if (!response.ok) throw new Error(`PocketBase API error: ${response.status}`);

    const data = await response.json();
    const projects = {};

    data.items.forEach(record => {
      const thumbnail = record.thumbnail
        ? `${POCKETBASE_URL}/api/files/projects/${record.id}/${record.thumbnail}`
        : '/images/placeholder.jpg';

      const images = (record.gallery || [])
        .map(file => ({
          type: 'file',
          src: `${POCKETBASE_URL}/api/files/projects/${record.id}/${file}`,
          filename: file
        }));

      // Parse video links
      const videoLinks = (record.video_links || '')
        .split('\n')
        .map(link => link.trim())
        .filter(Boolean)
        .map(link => {
          const parsed = parseVideoUrl(link);
          return parsed ? { type: 'embed', ...parsed } : null;
        })
        .filter(Boolean);

      // Merge images and embedded videos
      const allMedia = [...images, ...videoLinks];

      const captions = (record.gallery_captions || '')
        .split('\n')
        .map(cap => cap.trim())
        .filter(Boolean);

      projects[record.title] = {
        short_description: record.short_description || '',
        description: record.description || '',
        categories: normalizeCategories(record.categories),
        thumbnail: thumbnail,
        images: allMedia.length ? allMedia : (thumbnail ? [{type: 'file', src: thumbnail, filename: 'thumbnail'}] : []),
        captions: captions
      };
    });

    return Object.keys(projects).length ? projects : null;
  } catch (e) {
    console.warn('Failed to load PocketBase projects, using fallback data:', e);
    return null;
  }
}

function renderProjects(projectData, grid) {
  const entries = Object.entries(projectData);
  if (!grid || !entries.length) return;

  grid.innerHTML = '';
  entries.forEach(([title, data]) => {
    const article = document.createElement('article');
    article.className = 'project';
    article.dataset.category = data.categories || '';

    const imageWrap = document.createElement('div');
    imageWrap.className = 'project-image';

    const img = document.createElement('img');
    img.src = data.thumbnail || 'images/placeholder.jpg';
    img.alt = title;
    imageWrap.appendChild(img);

    const info = document.createElement('div');
    info.className = 'project-info';

    const heading = document.createElement('h4');
    heading.textContent = title;

    const sub = document.createElement('p');
    sub.textContent = data.short_description || data.description || '';

    info.appendChild(heading);
    info.appendChild(sub);

    article.appendChild(imageWrap);
    article.appendChild(info);

    grid.appendChild(article);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.querySelector('.grid');

  // Load CMS projects and merge with hardcoded data
  const cmsProjects = await loadCMSProjects();
  const fallbackProjects = {
    "The Great Canadian Baking Show": {
      short_description: "CBC Television",
      description: "Here are a few of the illustrations of competitors' bakes that I worked on that were featured on Season 8 of The Great Canadian Baking Show for CBC Television.",
      categories: "layout illustration-comics",
      thumbnail: "images/placeholder.jpg",
      images: ["images/bakingshow1.webp", "images/bakingshow2.webp", "images/bakingshow3.webp", "images/bakingshow4.webp", "images/bakingshow5.webp", "images/bakingshow6.webp"]
    },
    "Wordsville": {
      short_description: "TVOKids",
      description: "I had the pleasure of acting as Layout Supervisor, Location Designer, and Background Artist on Wordsville for TVOKids. Here are some of the backgrounds I created for the show.",
      categories: "layout",
      thumbnail: "images/wordsville2.webp",
      images: ["images/wordsville1.webp", "images/wordsville2.webp", "images/wordsville3.webp", "images/wordsville4.webp"]
    },
    "Dino Dex": {
      short_description: "TVOKids",
      description: "Being Layout Arist/Background Painter on Dino Dex for TVOKids was fun because I got to develop two very distinct styles for the episodes, 'Dino World' and 'Dino Bodies.'",
      categories: "layout",
      thumbnail: "images/placeholder3.jpg",
      images: ["images/dinodex1.webp", "images/dinodex2.webp", "images/dinodex3.webp", "images/dinobodies1.webp", "images/dinobodies2.webp", "images/dinobodies3.webp", "images/dinobodies4.webp"]
    },
    "Armadillo Avalanche": {
      short_description: "Marble Media",
      description: "It was a real pleasure and privilege to work as Layout Supervisor and Background Artist on Armadillo Avalanche, a series of digital shorts for Marble Media.",
      categories: "layout",
      thumbnail: "images/armadillo1.jpg",
      images: ["images/armadillo1.jpg", "images/armadillo2.webp", "images/armadillo3.webp", "images/armadillo4.webp", "images/armadillo5.webp", "images/armadillo6.webp"]
    },
    "Housebroken": {
      short_description: "Fox",
      description: "In a coproduction between Smiley Guy (TO) and Bento Box (LA) I was Assistant Layout Supervisor and Background Artist on Housebroken for Fox.",
      categories: "layout",
      thumbnail: "images/housebrokenthumbnail.jpg",
      images: ["images/housebroken1.webp", "images/housebroken2.webp", "images/housebroken3.webp"]
    }
  };

  const projectData = cmsProjects || fallbackProjects;
  renderProjects(projectData, grid);

  // ------------------------
  // FILTER PROJECTS
  // ------------------------
  const buttons = document.querySelectorAll(".filter-btn");
  let projects = document.querySelectorAll(".project");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter.toLowerCase();

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      projects = document.querySelectorAll(".project");
      projects.forEach(project => {
        const cats = project.dataset.category;
        project.style.display = (filter === "all" || cats.includes(filter)) ? "" : "none";
      });
    });
  });

  // ------------------------
  // MODAL SETUP
  // ------------------------
  const modal = document.getElementById('project-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalMedia = document.getElementById('modal-media');
  const modalCaption = document.getElementById('modal-caption');
  const closeBtn = document.querySelector('.close');
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');

  let currentImages = [];
  let currentCaptions = [];
  let currentIndex = 0;
  let currentMediaElement = null;

  // Open modal on project click using event delegation
  grid.addEventListener('click', (e) => {
    const project = e.target.closest('.project');
    if (!project) return;

    const clickHandler = () => {
      const title = project.querySelector('h4').textContent;
      const data = projectData[title];
      if (!data) return;

      modalTitle.textContent = title;
      modalDescription.textContent = data.description;

      currentImages = data.images && data.images.length ? data.images : [data.thumbnail].filter(Boolean);
      currentCaptions = data.captions || [];
      if (!currentImages.length) {
        currentImages = ['images/placeholder.jpg'];
      }
      currentIndex = 0;

      // Load and display first media
      showImage(0, 1, true);
    };
    clickHandler();
  });

  // ------------------------
  // SHOW IMAGE/VIDEO WITH FADE/SLIDE
  // ------------------------
  function showImage(index, direction = 1, isFirstLoad = false) {
    currentIndex = index;
    
    // Update caption
    modalCaption.textContent = currentCaptions[currentIndex] || '';

    const mediaItem = currentImages[index];
    
    // Normalize mediaItem to always be an object
    const mediaObj = typeof mediaItem === 'string' 
      ? { type: 'file', src: mediaItem, filename: mediaItem }
      : mediaItem;
    
    // Check if it's an embed by looking for embed property
    const isEmbed = !!(mediaObj.embed);
    const mediaPath = mediaObj.src || mediaObj.embed || mediaItem;
    const isVideo = !isEmbed && isVideoFile(mediaPath);

    // Remove old media element
    if (currentMediaElement) {
      currentMediaElement.classList.remove('show-image');
    }

    // Create new media element (iframe, video, or img)
    let mediaElement;
    if (isEmbed) {
      mediaElement = document.createElement('iframe');
      mediaElement.src = mediaObj.embed;
      mediaElement.frameborder = '0';
      mediaElement.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      mediaElement.allowFullscreen = true;
      mediaElement.width = '100%';
      mediaElement.height = '400';
    } else {
      mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
      mediaElement.src = mediaPath;
      mediaElement.alt = 'Project Media';
      if (isVideo) {
        mediaElement.controls = true;
      }
      mediaElement.style.width = '100%';
      mediaElement.style.maxHeight = '70vh';
      mediaElement.style.objectFit = 'contain';
    }
    
    mediaElement.className = 'modal-media-element';

    // Set up animation styles
    mediaElement.style.opacity = '0';
    mediaElement.style.transform = `translateX(${direction * 20}px)`;
    mediaElement.style.transition = 'none';

    const loadMedia = () => {
      // Clear old media and add new one
      modalMedia.innerHTML = '';
      modalMedia.appendChild(mediaElement);

      // Trigger animation
      requestAnimationFrame(() => {
        mediaElement.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        mediaElement.style.opacity = '1';
        mediaElement.style.transform = 'translateX(0)';
        mediaElement.classList.add('show-image');
      });

      // Show modal if first load
      if (isFirstLoad) {
        modal.classList.add('show');
      }
    };

    if (isEmbed) {
      // Embedded iframes load immediately
      loadMedia();
    } else if (isVideo) {
      // Videos load asynchronously; use canplay event
      mediaElement.addEventListener('canplay', loadMedia, { once: true });
      mediaElement.addEventListener('error', () => {
        console.error(`Failed to load video: ${mediaPath}`);
        loadMedia(); // Show anyway
      });
    } else {
      // Images use onload
      const img = new Image();
      img.src = mediaPath;
      img.onload = loadMedia;
      img.onerror = () => {
        console.error(`Failed to load image: ${mediaPath}`);
        loadMedia(); // Show anyway
      };
    }

    currentMediaElement = mediaElement;
  }

  // ------------------------
  // NAVIGATION
  // ------------------------
  prevBtn.addEventListener('click', () => {
    const prevIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    showImage(prevIndex, -1);
  });

  nextBtn.addEventListener('click', () => {
    const nextIndex = (currentIndex + 1) % currentImages.length;
    showImage(nextIndex, 1);
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('show')) return;

    if (e.key === 'ArrowRight') {
      const nextIndex = (currentIndex + 1) % currentImages.length;
      showImage(nextIndex, 1);
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      showImage(prevIndex, -1);
    } else if (e.key === 'Escape') {
      closeModal();
    }
  });

  // ------------------------
  // CLOSE MODAL
  // ------------------------
  function closeModal() {
    modal.classList.remove('show');
    if (currentMediaElement) {
      currentMediaElement.classList.remove('show-image');
    }
  }

  closeBtn.addEventListener('click', closeModal);
  window.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // ------------------------
  // TOUCH SWIPE
  // ------------------------
  let touchStartX = 0;
  let touchEndX = 0;

  modalMedia.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modalMedia.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const swipeThreshold = 50;

    if (touchEndX < touchStartX - swipeThreshold) {
      const nextIndex = (currentIndex + 1) % currentImages.length;
      showImage(nextIndex, 1);
    } else if (touchEndX > touchStartX + swipeThreshold) {
      const prevIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      showImage(prevIndex, -1);
    }
  }, { passive: true });

  // ------------------------
  // SCROLL "WORK" LINK TO FILTERS
  // ------------------------
  const workLink = document.querySelector('a[href="#work"]');
  const filterSection = document.querySelector('.filters');

  workLink.addEventListener('click', e => {
    e.preventDefault();
    filterSection.scrollIntoView({ behavior: 'smooth' });
  });

});
