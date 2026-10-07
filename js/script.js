// Adam Waito portfolio — small progressive-enhancement helpers

document.addEventListener('DOMContentLoaded', () => {
  // Scroll-linked nav bubbles: they scrub continuously from their scattered
  // hero positions (defined in css/style.css as .bubble--x { top / left }) to
  // a neat docked row as the user scrolls through the hero, reaching the
  // dock shortly before the hero fully leaves view.
  const hero = document.querySelector('.hero');

  // right-to-left dock order: home, about, work, contact
  const dockOrder = ['home', 'about', 'work', 'contact'];

  const bubbleEls = {
    home: document.querySelector('.bubble--home'),
    about: document.querySelector('.bubble--about'),
    work: document.querySelector('.bubble--work'),
    contact: document.querySelector('.bubble--contact'),
  };

  // scroll-linked weight scrub for the hero name: "Adam" 200→900, "Waito" 900→200
  const heroFirst = document.querySelector('.hero__first');
  const heroLast = document.querySelector('.hero__last');
  const WEIGHT_MIN = 100;
  const WEIGHT_MAX = 900;

  // scroll-linked weight scrub for the about hello text: 100→700
  const aboutHello = document.querySelector('.about__hello');
  const aboutSection = document.querySelector('.about');
  const ABOUT_WEIGHT_MIN = 100;
  const ABOUT_WEIGHT_MAX = 700;

  // scroll-linked variation scrub for illustration category title
  const illustrationTitle = document.querySelector('.work__category-title--illustration');
  const workSection = document.querySelector('.work');
  const ILLUST_OPSZ_START = 100;
  const ILLUST_OPSZ_END = 1000;
  const ILLUST_WGHT_START = 1000;
  const ILLUST_WGHT_END = 100;

  // scroll-linked path scrub for motion category title
  const motionTitle = document.querySelector('.work__category-title--motion');
  const motionSection = document.querySelector('.work__category--motion');
  const motionPath = document.querySelector('#motion-path');
  const motionText = document.querySelector('#motion-text');
  const MOTION_VIEWBOX_WIDTH = 1000;
  const MOTION_MAX_TEXT_RATIO = 0.9;
  let motionPathLength = 0;
  let motionTextLength = 0;
  let motionStartOffset = 0;
  let motionEndOffset = 0;

  
  // hero__bar: CSS sticky slides it up with the page and locks it to the top;
  // meanwhile its nav items scrub from spread-out to clustered-left
  const heroBar = document.querySelector('.hero__bar');
  const heroBarLinks = Array.from(document.querySelectorAll('.hero__bar a'));

  let barHeight = 0;
  let barTargets = [];

  let bubbleSize = 0;
  let dockConfig = { edge: 0, top: 0, gap: 0, belowBar: false };
  let scatterTargets = {};

  const masonryGrids = [
    document.querySelector('#work-webux .work__grid'),
    document.querySelector('#work-illustration .work__grid'),
    document.querySelector('#work-layout .work__grid'),
    document.querySelector('#work-motion .work__grid'),
  ].filter(Boolean);

  const SCROLL_ANIMATION_FPS = 12;
  const SCROLL_ANIMATION_IDLE_DELAY = 150;
  let scrollAnimationIdleTimer;
  let scrollAnimationFrame;
  let scrollAnimationIsActive = false;
  let scrollAnimationLastFrameTime = 0;

  // frames share the file type of the card's first frame (.png, .webp, …)
  const frameExtension = image => (image.getAttribute('src').match(/\.\w+$/) || ['.png'])[0];

  const playScrollAnimations = timestamp => {
    if (!scrollAnimationIsActive) return;

    if (timestamp - scrollAnimationLastFrameTime >= 1000 / SCROLL_ANIMATION_FPS) {
      document.querySelectorAll('[data-scroll-animation]').forEach(image => {
        const frameCount = Number(image.dataset.frameCount);
        const frameStart = Number(image.dataset.frameStart);
        const nextFrame = Number(image.dataset.frame) + 1 >= frameStart + frameCount
          ? frameStart
          : Number(image.dataset.frame) + 1;
        image.dataset.frame = nextFrame;
        image.src = `${image.dataset.framePath}${String(nextFrame).padStart(4, '0')}${frameExtension(image)}`;
      });
      scrollAnimationLastFrameTime = timestamp;
    }

    scrollAnimationFrame = requestAnimationFrame(playScrollAnimations);
  };
  const stopScrollAnimations = () => {
    scrollAnimationIsActive = false;
    cancelAnimationFrame(scrollAnimationFrame);
  };
  const showScrollAnimationsWhileScrolling = () => {
    window.clearTimeout(scrollAnimationIdleTimer);
    if (!scrollAnimationIsActive) {
      scrollAnimationIsActive = true;
      scrollAnimationLastFrameTime = performance.now();
      scrollAnimationFrame = requestAnimationFrame(playScrollAnimations);
    }
    scrollAnimationIdleTimer = window.setTimeout(stopScrollAnimations, SCROLL_ANIMATION_IDLE_DELAY);
  };

  // ===== Project gallery modal =====
  // Illustration cards are subcategories: a card opens the gallery whose key matches
  // the first line of its title ("EDITORIAL\n…" → galleries.json › illustration › editorial).
  // Other sections have one gallery for the whole category (galleries.json › layout ›
  // projects); a card opens it at the project whose name matches its title.
  // All images in a gallery form one sequence, so stepping past a project's last
  // image continues into the next project.
  const CATEGORY_LABELS = {
    webux: 'Web / Dev / UX',
    illustration: 'Illustration',
    layout: '2D Layout / BG Art',
    motion: 'Motion / Animation',
  };
  const projectModal = document.querySelector('#project-modal');
  // galleries.json first; if that can't load (e.g. local file preview), use the admin's saved copy
  const savedGalleries = () => {
    try { return JSON.parse(localStorage.getItem('adam-waito-portfolio-galleries') || 'null') || {}; } catch (error) { return {}; }
  };
  const galleriesPromise = fetch('galleries.json', { cache: 'no-store' })
    .then(response => (response.ok ? response.json() : savedGalleries()))
    .catch(savedGalleries);

  const galleryKey = title => String(title || '').split('\n')[0].trim().toLowerCase();
  // a card's title may be shorter than its gallery project's name ("Poetry In Voice" vs
  // "Poetry In Voice / Les voix de la poésie"), so fall back to the most shared words
  const findProjectIndex = (projects, title) => {
    const key = galleryKey(title);
    const exact = projects.findIndex(project => galleryKey(project.name) === key);
    if (exact !== -1) return exact;
    const words = text => new Set(galleryKey(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean));
    const titleWords = words(title);
    let best = -1, bestScore = 0;
    projects.forEach((project, index) => {
      const score = [...words(project.name)].filter(word => titleWords.has(word)).length;
      if (score > bestScore) { best = index; bestScore = score; }
    });
    return best;
  };
  const displayName = text => {
    const line = String(text || '').split('\n')[0].trim();
    return line === line.toUpperCase() ? line.charAt(0) + line.slice(1).toLowerCase() : line;
  };

  // Gallery items are images by default; { "type": "video", "src": <url> } embeds a video.
  // YouTube and Vimeo links use their players; direct .mp4/.webm/.mov files use <video>.
  const parseVideo = url => {
    try {
      const parsed = new URL(url, window.location.href);
      const host = parsed.hostname.replace(/^(www|m)\./, '');
      let youtubeId = null;
      if (host === 'youtu.be') youtubeId = parsed.pathname.slice(1).split('/')[0];
      else if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
        youtubeId = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
      }
      if (youtubeId) {
        return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`, thumb: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` };
      }
      if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const [, id, hash] = parsed.pathname.match(/(\d+)(?:\/([0-9a-f]+))?/) || [];
        const privateHash = hash || parsed.searchParams.get('h');
        if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}${privateHash ? `?h=${privateHash}` : ''}` };
      }
      if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(parsed.pathname)) return { kind: 'file', src: url };
      return { kind: 'iframe', src: parsed.href }; // any other embeddable player URL
    } catch (error) {
      return { kind: 'file', src: url };
    }
  };
  const isVideoItem = item => item?.type === 'video';
  const itemThumb = item => item.thumb || (isVideoItem(item) ? parseVideo(item.src).thumb : item.src) || '';

  if (projectModal) {
    const breadcrumb = projectModal.querySelector('.project-modal__breadcrumb');
    const image = projectModal.querySelector('.project-modal__image');
    const imageButton = projectModal.querySelector('.project-modal__image-button');
    const videoBox = projectModal.querySelector('.project-modal__video');
    const caption = projectModal.querySelector('.project-modal__caption-text');
    const fullSizeLink = projectModal.querySelector('.project-modal__fullsize');
    const projectName = projectModal.querySelector('.project-modal__name');
    const projectDescription = projectModal.querySelector('.project-modal__description');
    const projectInfo = projectModal.querySelector('.project-modal__info');
    const strip = projectModal.querySelector('.project-modal__strip');
    const stageArrows = projectModal.querySelectorAll('.project-modal__arrow');
    const stripArrows = projectModal.querySelectorAll('.project-modal__strip-arrow');
    const closeButton = projectModal.querySelector('.project-modal__close');
    const indexList = projectModal.querySelector('.project-modal__index-list');
    const indexArrows = projectModal.querySelectorAll('.project-modal__index-arrow');

    let sequence = []; // flat list of { project, projectIndex, image, thumb }
    let current = 0;
    let shownProject = null; // the project whose description is showing
    let projectButtons = [];
    let indexButtons = [];
    let returnFocusTo = null;

    const show = index => {
      if (!sequence.length) return;
      current = (index + sequence.length) % sequence.length;
      const entry = sequence[current];
      const isVideo = isVideoItem(entry.image);
      imageButton.hidden = isVideo;
      videoBox.hidden = !isVideo;
      videoBox.replaceChildren(); // removing the player also stops playback
      if (isVideo) {
        const video = parseVideo(entry.image.src);
        const player = document.createElement(video.kind === 'file' ? 'video' : 'iframe');
        player.src = video.src;
        player.title = entry.image.caption || `${entry.project.name} video`;
        if (video.kind === 'file') {
          player.controls = true;
          player.playsInline = true;
          player.preload = 'metadata';
          if (entry.image.thumb) player.poster = entry.image.thumb;
        } else {
          player.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
          player.allowFullscreen = true;
          player.referrerPolicy = 'strict-origin-when-cross-origin';
        }
        videoBox.append(player);
      } else {
        image.src = entry.image.src;
        image.alt = entry.image.alt || entry.image.caption || entry.project.name;
      }
      caption.textContent = entry.image.caption || '';
      // videos have no full-size image to link to
      fullSizeLink.hidden = isVideo;
      if (!isVideo) fullSizeLink.href = new URL(entry.image.src, window.location.href).href;
      projectName.textContent = entry.project.name || '';
      // a new project's description starts at the top, not where the last one was scrolled to
      if (entry.project !== shownProject) projectInfo.scrollTop = 0;
      shownProject = entry.project;
      // typed URLs become links (built as nodes, so description text is never parsed as HTML)
      projectDescription.replaceChildren();
      String(entry.project.description || '').split(/((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)'"])/i).forEach((part, index) => {
        if (index % 2 === 0) { if (part) projectDescription.append(part); return; }
        const link = document.createElement('a');
        link.href = /^www\./i.test(part) ? `https://${part}` : part;
        link.textContent = part;
        link.target = '_blank';
        link.rel = 'noopener';
        projectDescription.append(link);
      });

      sequence.forEach((item, i) => item.thumb.classList.toggle('is-active', i === current));
      projectButtons.forEach((button, i) => button.classList.toggle('is-active', i === entry.projectIndex));
      indexButtons.forEach((button, i) => {
        const isActive = i === entry.projectIndex;
        button.classList.toggle('is-active', isActive);
        if (isActive) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
      });
      // keep the current project's name visible in the list
      const activeName = indexButtons[entry.projectIndex];
      if (activeName) {
        const listBox = indexList.getBoundingClientRect();
        const nameBox = activeName.getBoundingClientRect();
        if (nameBox.top < listBox.top || nameBox.bottom > listBox.bottom) {
          indexList.scrollTop += nameBox.top - listBox.top - (listBox.height - nameBox.height) / 2;
        }
      }

      // keep the active thumbnail visible without scrolling the page
      // (measured on screen, since offsetLeft is relative to the panel, not the strip)
      const stripBox = strip.getBoundingClientRect();
      const thumbBox = entry.thumb.getBoundingClientRect();
      if (thumbBox.left < stripBox.left || thumbBox.right > stripBox.right) {
        strip.scrollTo({ left: strip.scrollLeft + thumbBox.left - stripBox.left - (stripBox.width - thumbBox.width) / 2 });
      }
    };

    const buildStrip = projects => {
      strip.replaceChildren();
      indexList.replaceChildren();
      sequence = [];
      projectButtons = [];
      indexButtons = [];
      projects.forEach((project, projectIndex) => {
        const group = document.createElement('div');
        group.className = 'project-modal__group';
        const projectButton = document.createElement('button');
        projectButton.type = 'button';
        projectButton.className = 'project-modal__project-button';
        projectButton.textContent = project.name || `Project ${projectIndex + 1}`;
        const firstIndex = sequence.length;
        projectButton.addEventListener('click', () => show(firstIndex));
        projectButtons.push(projectButton);

        const indexItem = document.createElement('li');
        const indexButton = document.createElement('button');
        indexButton.type = 'button';
        indexButton.className = 'project-modal__index-button';
        indexButton.textContent = projectButton.textContent;
        indexButton.title = projectButton.textContent; // full name when truncated
        indexButton.addEventListener('click', () => show(firstIndex));
        indexItem.append(indexButton);
        indexList.append(indexItem);
        indexButtons.push(indexButton);

        const thumbs = document.createElement('div');
        thumbs.className = 'project-modal__thumbs';
        (project.images || []).forEach(projectImage => {
          const index = sequence.length;
          const thumb = document.createElement('button');
          thumb.type = 'button';
          thumb.className = 'project-modal__thumb';
          const isVideo = isVideoItem(projectImage);
          thumb.classList.toggle('is-video', isVideo);
          thumb.setAttribute('aria-label', projectImage.caption || `${project.name} ${isVideo ? 'video' : 'image'}`);
          const thumbSrc = itemThumb(projectImage);
          if (thumbSrc) {
            const thumbImage = document.createElement('img');
            thumbImage.src = thumbSrc;
            thumbImage.alt = '';
            thumbImage.loading = 'lazy';
            thumb.append(thumbImage);
          }
          thumb.addEventListener('click', () => show(index));
          thumbs.append(thumb);
          sequence.push({ project, projectIndex, image: projectImage, thumb });
        });
        group.append(projectButton, thumbs);
        strip.append(group);
      });
      const multiple = sequence.length > 1;
      stageArrows.forEach(arrow => { arrow.hidden = !multiple; });
      projectModal.querySelectorAll('.project-modal__skip').forEach(button => { button.style.visibility = projects.length > 1 ? '' : 'hidden'; });
    };

    const updateStripArrows = () => {
      const overflows = strip.scrollWidth > strip.clientWidth + 1;
      stripArrows.forEach(arrow => { arrow.style.visibility = overflows ? '' : 'hidden'; });
      const listOverflows = indexList.scrollHeight > indexList.clientHeight + 1;
      indexArrows.forEach(arrow => { arrow.style.visibility = listOverflows ? '' : 'hidden'; });
    };

    const openGallery = (category, subcategory, projects, startProject = 0) => {
      const categoryLabel = CATEGORY_LABELS[category] || displayName(category);
      breadcrumb.textContent = subcategory ? `${categoryLabel} / ${displayName(subcategory)}` : categoryLabel;
      buildStrip(projects);
      returnFocusTo = document.activeElement;
      projectModal.classList.add('is-open');
      projectModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-is-open');
      strip.scrollLeft = 0;
      show(Math.max(sequence.findIndex(entry => entry.projectIndex === startProject), 0));
      updateStripArrows();
      closeButton.focus();
    };

    const closeGallery = () => {
      if (!projectModal.classList.contains('is-open')) return;
      projectModal.classList.remove('is-open');
      projectModal.setAttribute('aria-hidden', 'true');
      videoBox.replaceChildren(); // stop any playing video
      document.body.classList.remove('modal-is-open');
      returnFocusTo?.focus?.();
    };

    projectModal.querySelector('.project-modal__arrow--prev').addEventListener('click', () => show(current - 1));
    projectModal.querySelector('.project-modal__arrow--next').addEventListener('click', () => show(current + 1));
    // tapping the image steps forward; the caption's [full size] link opens it in a new tab
    imageButton.addEventListener('click', () => show(current + 1));
    // |◀ ▶| jump to the first image of the previous/next project (skipping any without images)
    const skipProject = direction => {
      const projectCount = projectButtons.length;
      let target = sequence[current].projectIndex;
      for (let step = 0; step < projectCount; step++) {
        target = (target + direction + projectCount) % projectCount;
        const first = sequence.findIndex(entry => entry.projectIndex === target);
        if (first !== -1) { show(first); return; }
      }
    };
    projectModal.querySelectorAll('.project-modal__skip').forEach(button => {
      button.addEventListener('click', () => skipProject(button.classList.contains('project-modal__skip--prev') ? -1 : 1));
    });
    stripArrows.forEach(arrow => {
      const direction = arrow.classList.contains('project-modal__strip-arrow--prev') ? -1 : 1;
      arrow.addEventListener('click', () => strip.scrollBy({ left: direction * strip.clientWidth * 0.8 }));
    });
    indexArrows.forEach(arrow => {
      const direction = arrow.classList.contains('project-modal__index-arrow--up') ? -1 : 1;
      arrow.addEventListener('click', () => indexList.scrollBy({ top: direction * indexList.clientHeight * 0.8, behavior: 'smooth' }));
    });
    projectModal.querySelectorAll('[data-modal-close]').forEach(control => control.addEventListener('click', closeGallery));
    window.addEventListener('resize', () => { if (projectModal.classList.contains('is-open')) updateStripArrows(); });

    document.addEventListener('keydown', event => {
      if (!projectModal.classList.contains('is-open')) return;
      if (event.key === 'Escape') closeGallery();
      if (event.key === 'ArrowRight') show(current + 1);
      if (event.key === 'ArrowLeft') show(current - 1);
    });

    // one delegated listener covers both the HTML-authored and projects.json cards
    document.addEventListener('click', async event => {
      const card = event.target.closest('.work__card:not(.work__card--text)');
      if (!card) return;
      const category = card.closest('.work__category')?.id.replace('work-', '');
      const title = card.dataset.title || card.querySelector('img')?.alt || '';
      event.preventDefault();
      const galleries = await galleriesPromise;
      const sectionGallery = galleries[category];
      if (Array.isArray(sectionGallery?.projects)) {
        const projects = sectionGallery.projects;
        const start = findProjectIndex(projects, title);
        if (projects.some(project => project.images?.length)) openGallery(category, null, projects, Math.max(start, 0));
        return;
      }
      const projects = sectionGallery?.[galleryKey(title)]?.projects;
      if (projects?.some(project => project.images?.length)) openGallery(category, title, projects);
    });
  }

  const applySavedProjects = savedProjects => {
    if (!savedProjects) return;
    Object.entries(savedProjects).forEach(([category, categoryProjects]) => {
      if (!Array.isArray(categoryProjects) || !categoryProjects.length) return;
      const grid = document.querySelector(`#work-${category} .work__grid`);
      if (!grid) return;
      grid.querySelectorAll('.work__card').forEach(card => card.remove());
      categoryProjects.forEach(project => {
        const isTextCard = project.type === 'text';
        const card = document.createElement(isTextCard ? 'div' : 'a');
        card.className = `work__card${isTextCard ? ' work__card--text' : ''}`;
        if (!isTextCard) card.href = '#';
        card.dataset.column = project.column || '';
        card.dataset.order = project.order || '';
        card.dataset.span = project.span || 1;
        if (!isTextCard) card.dataset.title = project.title || '';
        if (isTextCard) {
          const content = document.createElement('span');
          content.textContent = project.content || '';
          card.append(content);
          grid.append(card);
          return;
        }
        const scrollAnimation = project.scrollAnimation;
        const animationAttributes = scrollAnimation
          ? ` data-scroll-animation data-frame="${scrollAnimation.frameStart || 0}" data-frame-start="${scrollAnimation.frameStart || 0}" data-frame-count="${scrollAnimation.frameCount}" data-frame-path="${scrollAnimation.framePath}"`
          : '';
        card.innerHTML = `<div class="work__card-img"><img src="${project.image}" alt="${project.alt || project.title}"${animationAttributes}></div><span class="work__card-label"><span class="work__card-label-text"></span></span>`;
        card.querySelector('.work__card-label-text').textContent = project.title;
        grid.append(card);
      });
    });
  };
  const loadProjectData = async () => {
    try {
      const response = await fetch('projects.json', { cache: 'no-store' });
      if (response.ok) {
        applySavedProjects(await response.json());
        return;
      }
    } catch (error) {
      // Local file previews do not support fetch consistently.
    }
    try {
      applySavedProjects(JSON.parse(localStorage.getItem('adam-waito-portfolio-projects') || 'null'));
    } catch (error) {
      // Keep the HTML-authored cards when no saved data is available.
    }
  };
  const layoutMasonry = grid => {
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.work__card'));
    const columnCount = window.innerWidth <= 720 ? 1 : 4;
    const gap = 6;
    const gridWidth = grid.getBoundingClientRect().width;
    const unit = (gridWidth - gap * (columnCount - 1)) / columnCount;
    const columnWidths = Array(columnCount).fill(unit);
    const columnTops = Array(columnCount).fill(0);
    const indexedCards = cards.map((card, index) => ({ card, index }));
    const manuallyPlaced = indexedCards
      .filter(({ card }) => card.dataset.column)
      .sort((first, second) => {
        const firstOrder = Number(first.card.dataset.order) || 0;
        const secondOrder = Number(second.card.dataset.order) || 0;
        return firstOrder - secondOrder || first.index - second.index;
      });
    const automaticallyPlaced = indexedCards.filter(({ card }) => !card.dataset.column);

    [...manuallyPlaced, ...automaticallyPlaced].forEach(({ card }) => {
      const image = card.querySelector('img');
      const isTextCard = card.classList.contains('work__card--text');
      const imageRatio = image && image.naturalWidth
        ? image.naturalHeight / image.naturalWidth
        : isTextCard
          ? 0.5
          : 3 / 4;
      const requestedColumn = Number(card.dataset.column) - 1;
      const span = Math.min(Math.max(Number(card.dataset.span) || 1, 1), columnCount);
      const column = Number.isInteger(requestedColumn) && requestedColumn >= 0 && requestedColumn + span <= columnCount
        ? requestedColumn
        : columnTops.indexOf(Math.min(...columnTops));
      const left = columnWidths.slice(0, column).reduce((total, width) => total + width + gap, 0);
      const width = span === 1
        ? columnWidths[column]
        : columnWidths.slice(column, column + span).reduce((total, width) => total + width, 0) + gap * (span - 1);
      const cardHeight = isTextCard
        ? (() => {
          card.style.width = `${width}px`;
          return card.getBoundingClientRect().height;
        })()
        : width * imageRatio;
      const cardTop = Math.max(...columnTops.slice(column, column + span));

      card.style.width = `${width}px`;
      card.style.left = `${left}px`;
      card.style.top = `${cardTop}px`;
      for (let i = column; i < column + span; i++) {
        columnTops[i] = cardTop + cardHeight + gap;
      }
    });

    grid.style.height = `${Math.max(...columnTops) - gap}px`;
  };

  // Reads the CSS-authored scattered top/left (and --dock-* vars) for the
  // current viewport, so editing the CSS is all that's needed to reposition.
  const measure = () => {
    const referenceEl = bubbleEls.home;

    bubbleSize = referenceEl.getBoundingClientRect().width;

    const dockStyle = getComputedStyle(referenceEl);
    dockConfig = {
      edge: parseFloat(dockStyle.getPropertyValue('--dock-edge')) || 0,
      top: parseFloat(dockStyle.getPropertyValue('--dock-top')) || 0,
      gap: parseFloat(dockStyle.getPropertyValue('--dock-gap')) || 0,
      belowBar: dockStyle.getPropertyValue('--dock-below-bar').trim() === '1',
    };

    // clear any inline overrides so getComputedStyle reflects the authored CSS rule
    dockOrder.forEach(key => {
      bubbleEls[key].style.top = '';
      bubbleEls[key].style.left = '';
    });

    scatterTargets = {};
    dockOrder.forEach(key => {
      const cs = getComputedStyle(bubbleEls[key]);
      scatterTargets[key] = { top: parseFloat(cs.top), left: parseFloat(cs.left) };
    });

    barHeight = heroBar.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--hero-bar-height', `${barHeight}px`);

    // measure the natural (spread-out) position of each nav item, then
    // briefly switch to the clustered-left layout to measure its target
    heroBarLinks.forEach(el => { el.style.transform = ''; });
    const naturalLefts = heroBarLinks.map(el => el.getBoundingClientRect().left);

    heroBar.classList.add('hero__bar--measuring-cluster');
    const clusteredLefts = heroBarLinks.map(el => el.getBoundingClientRect().left);
    heroBar.classList.remove('hero__bar--measuring-cluster');

    // clustering only makes room for bubbles docked beside the bar, and on
    // phones it wraps the links onto two rows that then overlap
    barTargets = heroBarLinks.map((el, i) => ({
      el,
      offset: dockConfig.belowBar ? 0 : clusteredLefts[i] - naturalLefts[i],
    }));

    masonryGrids.forEach(layoutMasonry);

    if (motionPath && motionText) {
      motionPathLength = motionPath.getTotalLength();
      motionText.removeAttribute('textLength');
      const naturalTextLength = motionText.getComputedTextLength();
      motionTextLength = Math.min(naturalTextLength, motionPathLength * MOTION_MAX_TEXT_RATIO);
      if (naturalTextLength > motionTextLength) {
        motionText.setAttribute('textLength', `${motionTextLength}`);
      }
      motionText.setAttribute('startOffset', '0');
      const startBounds = motionText.getBBox();
      motionStartOffset = Math.max(-startBounds.x, 0);

      const naturalEndOffset = Math.max(motionPathLength - motionTextLength, 0);
      motionText.setAttribute('startOffset', `${naturalEndOffset}`);
      const endBounds = motionText.getBBox();
      const endOverflow = Math.max(endBounds.x + endBounds.width - MOTION_VIEWBOX_WIDTH, 0);
      motionEndOffset = Math.max(naturalEndOffset - endOverflow, motionStartOffset);
    }
  };

  const applyPositions = (scrubY = window.scrollY) => {
    const vw = document.documentElement.clientWidth;
    const { edge, gap, belowBar } = dockConfig;
    // on phones the bubbles dock just under the sticky bar rather than over it;
    // on desktop their centres line up with the bar's bottom edge
    const dockTop = dockConfig.top + (belowBar ? barHeight : barHeight - bubbleSize / 2);

    const heroHeight = hero.offsetHeight;
    // reaches 1 a little before the hero has fully scrolled past
    const progress = Math.min(Math.max(scrubY / ((heroHeight + barHeight) * 0.75), 0), 1);

    dockOrder.forEach((key, i) => {
      const el = bubbleEls[key];
      const { top: scatterTop, left: scatterLeft } = scatterTargets[key];

      const dockIndex = dockOrder.length - 1 - i;
      const dockRight = edge + dockIndex * (bubbleSize + gap);
      const dockLeft = vw - dockRight - bubbleSize;

      el.style.top = `${scatterTop + (dockTop - scatterTop) * progress}px`;
      el.style.left = `${scatterLeft + (dockLeft - scatterLeft) * progress}px`;
      el.style.right = 'auto';
    });

    // "Adam" weight scrub disabled for now; its weight comes from .hero__first in style.css
    // heroFirst.style.fontWeight = WEIGHT_MIN + (WEIGHT_MAX - WEIGHT_MIN) * progress;
    heroLast.style.fontWeight = WEIGHT_MAX - (WEIGHT_MAX - WEIGHT_MIN) * progress;

    // About hello weight scrub: 100→700 as user scrolls to the about section
    if (aboutHello && aboutSection) {
      const aboutTop = aboutSection.offsetTop;
      const aboutHeight = aboutSection.offsetHeight;
      const aboutProgress = Math.min(Math.max((scrubY - (aboutTop - window.innerHeight)) / aboutHeight, 0), 1);
      aboutHello.style.fontWeight = ABOUT_WEIGHT_MIN + (ABOUT_WEIGHT_MAX - ABOUT_WEIGHT_MIN) * aboutProgress;
    }

    // Illustration title variation scrub: opsz 1000→100, wght 100→1000
    if (illustrationTitle && workSection) {
      const workTop = workSection.offsetTop;
      const workHeight = workSection.offsetHeight;
      const illustProgress = Math.min(Math.max((scrubY - (workTop - window.innerHeight)) / workHeight, 0), 1);
      const opsz = ILLUST_OPSZ_START + (ILLUST_OPSZ_END - ILLUST_OPSZ_START) * illustProgress;
      const wght = ILLUST_WGHT_START + (ILLUST_WGHT_END - ILLUST_WGHT_START) * illustProgress;
      illustrationTitle.style.fontVariationSettings = `"opsz" ${opsz.toFixed(0)}, "wght" ${wght.toFixed(0)}`;
      illustrationTitle.style.letterSpacing = `${0.7 * illustProgress}em`;
    }

    // Scrub the lettering along the four-oscillation SVG wave.
    if (motionTitle && motionSection && motionPath && motionText) {
      const motionTop = motionSection.offsetTop;
      const motionHeight = motionSection.offsetHeight;
      const motionProgress = Math.min(Math.max((scrubY - (motionTop - window.innerHeight)) / motionHeight, 0), 1);
      const offset = motionStartOffset + (motionEndOffset - motionStartOffset) * motionProgress;
      motionText.setAttribute('startOffset', `${offset}`);
    }

    // the bar sits directly below the hero until sticky pins it
    const barNaturalTop = heroHeight;

    // nav items scrub toward their clustered-left position over the same
    // stretch of scroll it takes the bar to reach and lock at the top
    const barProgress = Math.min(Math.max(scrubY / Math.max(barNaturalTop, 1), 0), 1);
    barTargets.forEach(({ el, offset }) => {
      el.style.transform = `translateX(${offset * barProgress}px)`;
    });
  };

  // Scrubs follow an eased copy of the scroll position so wheel notches glide
  // instead of jumping. Higher SCRUB_EASE = snappier, lower = smoother.
  const SCRUB_EASE = 0.12;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrubY = window.scrollY;
  let ticking = false;
  let lastTickTime = 0;

  const tick = timestamp => {
    const targetY = window.scrollY;
    const elapsed = lastTickTime ? Math.min(timestamp - lastTickTime, 100) : 16.7;
    lastTickTime = timestamp;
    // frame-rate independent easing, so 120Hz screens feel the same as 60Hz
    const ease = reduceMotion.matches ? 1 : 1 - Math.pow(1 - SCRUB_EASE, elapsed / 16.7);
    scrubY += (targetY - scrubY) * ease;
    if (Math.abs(targetY - scrubY) < 0.5) scrubY = targetY;

    applyPositions(scrubY);

    if (scrubY !== targetY) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
      lastTickTime = 0;
    }
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  };

  measure();
  applyPositions();

  // Touch screens have no hover, so a card scrolling through the top third of the
  // screen gets .is-in-focus, which shows the same colour/label as hovering
  const watchCardFocus = () => {
    if (!window.matchMedia('(hover: none)').matches) return;
    const focusObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-in-focus', entry.isIntersecting));
    }, { rootMargin: '0px 0px -66.67% 0px' }); // a band across the top third, where section links land
    document.querySelectorAll('.work__card:not(.work__card--text)').forEach(card => focusObserver.observe(card));
  };

  loadProjectData().then(() => {
    watchCardFocus();
    // Attach after loading, since applySavedProjects replaces the cards and their images.
    masonryGrids.forEach(grid => {
      grid.querySelectorAll('img').forEach(image => {
        if (!image.complete) image.addEventListener('load', () => layoutMasonry(grid), { once: true });
      });
    });
    masonryGrids.forEach(layoutMasonry);
    document.querySelectorAll('[data-scroll-animation]').forEach(image => {
      const frameCount = Number(image.dataset.frameCount);
      const frameStart = Number(image.dataset.frameStart);
      for (let frame = frameStart + 1; frame < frameStart + frameCount; frame++) {
        const preload = new Image();
        preload.src = `${image.dataset.framePath}${String(frame).padStart(4, '0')}${frameExtension(image)}`;
      }
    });
  });

  window.addEventListener('scroll', () => {
    requestUpdate();
    showScrollAnimationsWhileScrolling();
  }, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    scrubY = window.scrollY;
    applyPositions(scrubY);
  });

  /* WIN31: Windows 3.1 scrollbar, switched off with the window (see index.html). Uncomment to restore.
  // Windows 3.1-style scrollbar for .win31 windows: a fixed-size square thumb
  // that tracks the viewport, can be dragged, arrow buttons that repeat while
  // held, and track clicks that page up/down.
  const SCROLL_ARROW_STEP = 60;
  document.querySelectorAll('.win31').forEach(win => {
    const viewport = win.querySelector('.win31__viewport');
    const track = win.querySelector('.win31__scroll-track');
    const thumb = win.querySelector('.win31__scroll-thumb');
    if (!viewport || !track || !thumb) return;

    const maxScroll = () => Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
    const thumbTravel = () => Math.max(track.clientHeight - thumb.offsetHeight, 0);
    const syncThumb = () => {
      const max = maxScroll();
      thumb.hidden = max === 0;
      thumb.style.top = `${max ? (viewport.scrollTop / max) * thumbTravel() : 0}px`;
    };

    viewport.addEventListener('scroll', () => {
      syncThumb();
      showScrollAnimationsWhileScrolling();
    }, { passive: true });
    new ResizeObserver(syncThumb).observe(viewport);
    const grid = viewport.querySelector('.work__grid');
    if (grid) new ResizeObserver(syncThumb).observe(grid);

    thumb.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      thumb.setPointerCapture(event.pointerId);
      thumb.classList.add('is-dragging');
      const startY = event.clientY;
      const startScroll = viewport.scrollTop;
      const onMove = moveEvent => {
        const travel = thumbTravel();
        if (travel) viewport.scrollTop = startScroll + ((moveEvent.clientY - startY) / travel) * maxScroll();
      };
      const onUp = () => {
        thumb.classList.remove('is-dragging');
        thumb.removeEventListener('pointermove', onMove);
        thumb.removeEventListener('pointerup', onUp);
        thumb.removeEventListener('pointercancel', onUp);
      };
      thumb.addEventListener('pointermove', onMove);
      thumb.addEventListener('pointerup', onUp);
      thumb.addEventListener('pointercancel', onUp);
    });

    track.addEventListener('pointerdown', event => {
      if (event.target !== track) return;
      const direction = event.clientY < thumb.getBoundingClientRect().top ? -1 : 1;
      viewport.scrollTop += direction * viewport.clientHeight * 0.9;
    });

    win.querySelectorAll('.win31__scroll-button').forEach(button => {
      const direction = button.classList.contains('win31__scroll-button--up') ? -1 : 1;
      let repeatDelay;
      let repeatInterval;
      const stop = () => {
        clearTimeout(repeatDelay);
        clearInterval(repeatInterval);
      };
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        viewport.scrollTop += direction * SCROLL_ARROW_STEP;
        repeatDelay = setTimeout(() => {
          repeatInterval = setInterval(() => { viewport.scrollTop += direction * SCROLL_ARROW_STEP / 2; }, 40);
        }, 350);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => button.addEventListener(type, stop));
    });

    syncThumb();
  });
  */

  // Contact form: submit to Web3Forms in the background so the visitor stays on the page.
  // Without JS the form still posts normally to web3forms.com.
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    const status = contactForm.querySelector('.contact__status');
    const submit = contactForm.querySelector('.contact__submit');
    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = 'Sending…';
      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(contactForm),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) throw new Error(result.message);
        contactForm.reset();
        status.textContent = 'Thanks! Your message has been sent.';
      } catch (error) {
        status.textContent = 'Sorry, something went wrong. Please try again or email me directly.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  // Highlight the active section's nav bubble / work tab as the user scrolls
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.bubble-nav a, .work__tabs a, .hero__bar a');

  const setActive = (id) => {
    navLinks.forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, { rootMargin: '-40% 0px -50% 0px' });

  sections.forEach(section => observer.observe(section));
});
