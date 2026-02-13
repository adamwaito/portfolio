console.log('Portfolio loaded');

const CMS_REPO = 'adamwaito/portfolio';
const CMS_BRANCH = 'main';

function normalizeCategories(value) {
  if (!value) return '';
  return value
    .split(/[,\s]+/)
    .map(cat => cat.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
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

      if (itemKey === 'image') {
        data[currentListKey] = data[currentListKey] || [];
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
    const apiUrl = `https://api.github.com/repos/${CMS_REPO}/contents/content/projects`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    const files = await response.json();
    const markdownFiles = files
      .filter(file => file.type === 'file' && file.name.endsWith('.md'))
      .map(file => file.name);

    const projects = {};

    for (const file of markdownFiles) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${CMS_REPO}/${CMS_BRANCH}/content/projects/${file}`;
        const projectResponse = await fetch(rawUrl);
        if (!projectResponse.ok) throw new Error(`Raw fetch error: ${projectResponse.status}`);

        const projectContent = await projectResponse.text();
        const { data } = parseFrontmatter(projectContent);

        const images = Array.isArray(data.gallery)
          ? data.gallery
          : (data.gallery ? data.gallery.split(',').map(img => img.trim()) : []);

        projects[data.title] = {
          description: data.description || '',
          categories: normalizeCategories(data.categories),
          thumbnail: data.thumbnail || images[0] || '/images/placeholder.jpg',
          images: images.length ? images : (data.thumbnail ? [data.thumbnail] : [])
        };
      } catch (e) {
        console.warn(`Failed to load project ${file}:`, e);
      }
    }

    return Object.keys(projects).length ? projects : null;
  } catch (e) {
    console.warn('Failed to load CMS projects, using fallback data:', e);
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
    sub.textContent = data.description || '';

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
      description: "Here are a few of the illustrations of competitors' bakes that I worked on that were featured on Season 8 of The Great Canadian Baking Show for CBC Television.",
      categories: "layout illustration-comics",
      thumbnail: "images/placeholder.jpg",
      images: ["images/bakingshow1.webp", "images/bakingshow2.webp", "images/bakingshow3.webp", "images/bakingshow4.webp", "images/bakingshow5.webp", "images/bakingshow6.webp"]
    },
    "Wordsville": {
      description: "I had the pleasure of acting as Layout Supervisor, Location Designer, and Background Artist on Wordsville for TVOKids. Here are some of the backgrounds I created for the show.",
      categories: "layout",
      thumbnail: "images/wordsville2.webp",
      images: ["images/wordsville1.webp", "images/wordsville2.webp", "images/wordsville3.webp", "images/wordsville4.webp"]
    },
    "Dino Dex": {
      description: "Being Layout Arist/Background Painter on Dino Dex for TVOKids was fun because I got to develop two very distinct styles for the episodes, 'Dino World' and 'Dino Bodies.'",
      categories: "layout",
      thumbnail: "images/placeholder3.jpg",
      images: ["images/dinodex1.webp", "images/dinodex2.webp", "images/dinodex3.webp", "images/dinobodies1.webp", "images/dinobodies2.webp", "images/dinobodies3.webp", "images/dinobodies4.webp"]
    },
    "Armadillo Avalanche": {
      description: "It was a real pleasure and privilege to work as Layout Supervisor and Background Artist on Armadillo Avalanche, a series of digital shorts for Marble Media.",
      categories: "layout",
      thumbnail: "images/armadillo1.jpg",
      images: ["images/armadillo1.jpg", "images/armadillo2.webp", "images/armadillo3.webp", "images/armadillo4.webp", "images/armadillo5.webp", "images/armadillo6.webp"]
    },
    "Housebroken": {
      description: "In a coproduction between Smiley Guy (TO) and Bento Box (LA) I was Assistant Layout Supervisor and Background Artist on Housebroken for Fox.",
      categories: "layout",
      thumbnail: "images/housebrokenthumbnail.jpg",
      images: ["images/housebroken1.webp", "images/housebroken2.webp", "images/housebroken3.webp"]
    }
  };

  const projectData = { ...fallbackProjects, ...cmsProjects };
  renderProjects(projectData, grid);

  // ------------------------
  // FILTER PROJECTS
  // ------------------------
  const buttons = document.querySelectorAll(".filter-btn");
  let projects = document.querySelectorAll(".project");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;

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
  const modalImage = document.getElementById('modal-image');
  const closeBtn = document.querySelector('.close');
  const prevBtn = document.querySelector('.prev');
  const nextBtn = document.querySelector('.next');

  let currentImages = [];
  let currentIndex = 0;

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
      if (!currentImages.length) {
        currentImages = ['images/placeholder.jpg'];
      }
      currentIndex = 0;

      // Preload first image before showing modal
      const firstImg = new Image();
      firstImg.src = currentImages[0];
      firstImg.onload = () => {
        modalImage.src = firstImg.src;
        // Reset styles and add show-image class with proper animation
        modalImage.style.transition = 'none';
        modalImage.style.opacity = '1';
        modalImage.style.transform = 'translateX(0)';
        modalImage.classList.add('show-image');
        modal.classList.add('show');
      };
      firstImg.onerror = () => {
        console.error(`Failed to load image: ${currentImages[0]}`);
        modalImage.src = ''; // Clear src so broken image icon doesn't show
        modal.classList.add('show'); // Show modal anyway
      };
    };
    clickHandler();
  });

  // ------------------------
  // SHOW IMAGE WITH FADE/SLIDE
  // ------------------------
  function showImage(index, direction = 1) {
    currentIndex = index;

    modalImage.classList.remove('show-image');

    // preload new image
    const newImg = new Image();
    newImg.src = currentImages[index];
    
    const loadImage = () => {
      modalImage.style.transition = 'none';
      modalImage.style.transform = `translateX(${direction * 20}px)`;
      modalImage.style.opacity = '0';
      modalImage.src = newImg.src;

      requestAnimationFrame(() => {
        modalImage.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        // Clear inline styles to let CSS class rules take over
        modalImage.style.transform = '';
        modalImage.style.opacity = '';
        modalImage.classList.add('show-image');
      });
    };
    
    newImg.onload = loadImage;
    newImg.onerror = () => {
      console.error(`Failed to load image: ${currentImages[index]}`);
      loadImage(); // Show placeholder/previous image anyway
    };
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
    modalImage.classList.remove('show-image');
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

  modalImage.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });

  modalImage.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const swipeThreshold = 50;

    if (touchEndX < touchStartX - swipeThreshold) {
      const nextIndex = (currentIndex + 1) % currentImages.length;
      showImage(nextIndex, 1);
    } else if (touchEndX > touchStartX + swipeThreshold) {
      const prevIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      showImage(prevIndex, -1);
    }
  });

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
