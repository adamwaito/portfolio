const STORAGE_KEY = 'adam-waito-portfolio-projects';
const TEXT_CARD_MIGRATION_KEY = 'adam-waito-portfolio-text-cards-v1';

const defaultProjects = {
  webux: [
    {
      title: 'New Age Tape Generator',
      image: 'images/project_images/webux/newagetapeanimation/newagetapeanimation_0000.png',
      alt: 'New Age Tape Generator',
      column: 3,
      order: 2,
      span: 2,
      scrollAnimation: {
        framePath: 'images/project_images/webux/newagetapeanimation/newagetapeanimation_',
        frameCount: 21,
        frameStart: 0,
      },
    },
    { title: 'DripCheck App', image: 'images/project_images/project_placeholder_tall.webp', alt: 'DripCheck App', column: 2, order: 2, span: 1 },
    { title: 'Comics', image: 'images/project_images/project_placeholder_tall.webp', alt: 'Comics', column: 1, order: 1, span: 1 },
    { title: 'SparklingWater.life', image: 'images/project_images/project_placeholder_wide.webp', alt: 'SparklingWater.life', column: 1, order: 2, span: 2 },
    { type: 'text', content: "Web and User Experience design are especially exciting because they offer opportunities to synthesize diverse design forms, tools, and strategies from my toolkit. Motion design, typography, illustration, and even sound design can all be deployed and combined to solve particular problems, create engaging experiences—or simply to explore ideas.\n\nThrough a multifaceted design approach, I prioritize accessibility, creativity, and focus on creating mindful, meaningful, and memorable interactions rather than chasing purely frictionless design. Where's the fun in that?", column: 3, order: 1, span: 2 },
  ],
  illustration: [
    { title: 'Editorial', image: 'images/project_images/project_placeholder_wide.webp', alt: 'Editorial', column: 1, order: 2, span: 2 },
    { title: 'Posters', image: 'images/project_images/project_placeholder_tall.webp', alt: 'Posters', column: 4, order: 1, span: 1 },
    { title: 'Comics', image: 'images/project_images/project_placeholder_tall.webp', alt: 'Comics', column: 3, order: 2, span: 1 },
    { title: 'Other', image: 'images/project_images/project_placeholder_wide.webp', alt: 'Other', column: 2, order: 2, span: 1 },
    { type: 'text', content: 'My professional transition from musician to designer can be traced to the humble gig poster. In the 2010s I ended up producing hundreds of them, mostly in the context of the Montreal music scene, and the show poster is an art form that is still near and dear to my heart. From there I graduated to editorial illustrations, product design, hand drawn logos, training manuals, movie posters, comics, greeting cards, and about any other reason someone could want a drawing that you could imagine.', column: 3, order: 1, span: 1 },
  ],
  layout: [],
  motion: [],
};

const hadSavedProjects = Boolean(localStorage.getItem(STORAGE_KEY));
let projects = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || structuredClone(defaultProjects);
if (!localStorage.getItem(TEXT_CARD_MIGRATION_KEY)) {
  Object.entries(defaultProjects).forEach(([category, defaultItems]) => {
    if (defaultItems.some(project => project.type === 'text') && !projects[category].some(project => project.type === 'text')) {
      projects[category].push(...structuredClone(defaultItems.filter(project => project.type === 'text')));
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  localStorage.setItem(TEXT_CARD_MIGRATION_KEY, 'true');
}
// Galleries (the project modal content) live in galleries.json, keyed by
// section and by the first line of each card's title, lowercased.
const GALLERY_STORAGE_KEY = 'adam-waito-portfolio-galleries';
let galleries = JSON.parse(localStorage.getItem(GALLERY_STORAGE_KEY) || 'null');
const saveGalleries = () => localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(galleries));
const galleryKey = title => String(title || '').split('\n')[0].trim().toLowerCase();
// Illustration has subcategories (one gallery per card); every other section has one
// gallery for the whole category, whose projects are matched to cards by name.
const SUBCATEGORY_SECTIONS = ['illustration'];
const hasSectionGallery = category => !SUBCATEGORY_SECTIONS.includes(category);
const openGalleryEditors = new Set();

const categorySelect = document.querySelector('#category-select');
const projectList = document.querySelector('#project-list');
const emptyState = document.querySelector('#empty-state');

const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
const currentCategory = () => categorySelect.value;

Object.entries({ webux: 'Web / UX', illustration: 'Illustration', layout: '2D layout / BG art', motion: 'Motion / animation' }).forEach(([value, label]) => {
  categorySelect.add(new Option(label, value));
});

const render = () => {
  const category = currentCategory();
  projectList.replaceChildren();
  const items = projects[category] || [];
  emptyState.hidden = items.length > 0;
  if (hasSectionGallery(category)) projectList.append(createSectionGalleryEditor(category));

  items.forEach((project, index) => {
    const item = document.createElement('article');
    const isTextCard = project.type === 'text';
    item.className = `project-list__item${isTextCard ? ' project-list__item--text' : ''}`;
    item.innerHTML = `
      <form class="project-form">
        <div><label>Card type<select name="type"><option value="image"${isTextCard ? '' : ' selected'}>Image</option><option value="text"${isTextCard ? ' selected' : ''}>Text</option></select></label></div>
        <div class="project-form__title"><label>Title<textarea name="title" rows="2"${isTextCard ? '' : ' required'}>${escapeAttribute(project.title)}</textarea></label></div>
        <div class="project-form__image"><label>Image path<input name="image" value="${escapeAttribute(project.image)}" placeholder="images/project.jpg"></label></div>
        <div class="project-form__alt"><label>Alt text<input name="alt" value="${escapeAttribute(project.alt)}"></label></div>
        <div class="project-form__content"><label>Text content<textarea name="content" rows="6" placeholder="Write the card copy">${escapeAttribute(project.content)}</textarea></label></div>
        <div><label>Column<input name="column" type="number" min="1" max="4" value="${project.column || ''}"></label></div>
        <div><label>Order<input name="order" type="number" min="1" value="${project.order || ''}"></label></div>
        <div><label>Span<input name="span" type="number" min="1" max="4" value="${project.span || 1}"></label></div>
        <div class="project-form__animation"><label>Frame path<input name="animationFramePath" value="${escapeAttribute(project.scrollAnimation?.framePath)}" placeholder="images/project/frame_"></label></div>
        <div><label>Frame count<input name="animationFrameCount" type="number" min="1" value="${project.scrollAnimation?.frameCount || ''}" placeholder="0"></label></div>
        <div><label>Starting frame<input name="animationFrameStart" type="number" min="0" value="${project.scrollAnimation?.frameStart || 0}"></label></div>
        <div class="project-form__actions"><button type="submit">Save</button><button class="delete-project" type="button">Delete</button></div>
      </form>
      ${isTextCard ? '' : `<img class="project-preview" src="${escapeAttribute(project.image)}" alt="">`}
    `;
    const form = item.querySelector('form');
    const syncCardType = () => {
      const isTextCard = form.elements.type.value === 'text';
      item.classList.toggle('project-list__item--text', isTextCard);
      form.elements.title.required = !isTextCard;
    };
    syncCardType();
    form.elements.type.addEventListener('change', syncCardType);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(form);
      const animationFramePath = values.get('animationFramePath').trim();
      const animationFrameCount = Number(values.get('animationFrameCount'));
      const animationFrameStart = Math.max(Number(values.get('animationFrameStart')) || 0, 0);
      const nextProject = {
        title: values.get('title').trim(),
        image: values.get('image').trim(),
        alt: values.get('alt').trim(),
        column: Number(values.get('column')) || null,
        order: Number(values.get('order')) || null,
        span: Math.min(Math.max(Number(values.get('span')) || 1, 1), 4),
        ...(animationFramePath && animationFrameCount > 0 && {
          scrollAnimation: {
            framePath: animationFramePath,
            frameCount: Math.floor(animationFrameCount),
            frameStart: Math.floor(animationFrameStart),
          },
        }),
      };
      const oldKey = galleryKey(project.title);
      const newKey = galleryKey(nextProject.title);
      const sectionGalleries = galleries?.[category];
      if (values.get('type') !== 'text' && oldKey && newKey && oldKey !== newKey && hasSectionGallery(category)) {
        // keep the card linked to its project in the section gallery
        const galleryProject = sectionGalleries?.projects?.find(candidate => galleryKey(candidate.name) === oldKey);
        if (galleryProject) {
          galleryProject.name = nextProject.title.split('\n')[0].trim();
          saveGalleries();
        }
      } else if (values.get('type') !== 'text' && oldKey && newKey && oldKey !== newKey && sectionGalleries?.[oldKey] && !sectionGalleries[newKey]) {
        sectionGalleries[newKey] = sectionGalleries[oldKey];
        delete sectionGalleries[oldKey];
        if (openGalleryEditors.delete(`${category}/${oldKey}`)) openGalleryEditors.add(`${category}/${newKey}`);
        saveGalleries();
      }
      projects[category][index] = values.get('type') === 'text'
        ? {
          type: 'text',
          content: values.get('content').trim(),
          column: nextProject.column,
          order: nextProject.order,
          span: nextProject.span,
        }
        : nextProject;
      save();
      render();
    });
    form.querySelector('.delete-project').addEventListener('click', () => {
      if (window.confirm('Delete this project?')) {
        projects[category].splice(index, 1);
        save();
        render();
      }
    });
    if (!isTextCard && !hasSectionGallery(category)) item.append(createCardGalleryEditor(category, project.title));
    projectList.append(item);
  });
  renderPreview();
};

// Mirrors layoutMasonry() in script.js at a desktop reference width, then scales down to the sidebar.
const masonryPreview = document.querySelector('#masonry-preview');
const PREVIEW_REFERENCE_WIDTH = 1440;
const PREVIEW_COLUMNS = 4;
const PREVIEW_GAP = 4;
const imageRatios = new Map();
const textMeasure = document.createElement('div');
textMeasure.className = 'masonry-preview__measure';
document.body.append(textMeasure);

const getImageRatio = src => {
  if (!src) return null;
  if (!imageRatios.has(src)) {
    imageRatios.set(src, null);
    const image = new Image();
    image.addEventListener('load', () => {
      imageRatios.set(src, image.naturalHeight / image.naturalWidth);
      renderPreview();
    });
    image.src = src;
  }
  return imageRatios.get(src);
};

const renderPreview = () => {
  const items = projects[currentCategory()] || [];
  const unit = (PREVIEW_REFERENCE_WIDTH - PREVIEW_GAP * (PREVIEW_COLUMNS - 1)) / PREVIEW_COLUMNS;
  const columnTops = Array(PREVIEW_COLUMNS).fill(0);
  const indexed = items.map((project, index) => ({ project, index }));
  const manuallyPlaced = indexed
    .filter(({ project }) => project.column)
    .sort((first, second) => (first.project.order || 0) - (second.project.order || 0) || first.index - second.index);
  const automaticallyPlaced = indexed.filter(({ project }) => !project.column);

  const scale = (masonryPreview.clientWidth || 220) / PREVIEW_REFERENCE_WIDTH;
  masonryPreview.replaceChildren();

  [...manuallyPlaced, ...automaticallyPlaced].forEach(({ project, index }) => {
    const isTextCard = project.type === 'text';
    const requestedColumn = Number(project.column) - 1;
    const span = Math.min(Math.max(Number(project.span) || 1, 1), PREVIEW_COLUMNS);
    const column = Number.isInteger(requestedColumn) && requestedColumn >= 0 && requestedColumn + span <= PREVIEW_COLUMNS
      ? requestedColumn
      : columnTops.indexOf(Math.min(...columnTops));
    const left = column * (unit + PREVIEW_GAP);
    const width = unit * span + PREVIEW_GAP * (span - 1);
    let height;
    if (isTextCard) {
      textMeasure.style.width = `${width}px`;
      textMeasure.textContent = project.content || '';
      height = textMeasure.getBoundingClientRect().height;
    } else {
      height = width * (getImageRatio(project.image) || 3 / 4);
    }
    const top = Math.max(...columnTops.slice(column, column + span));
    for (let i = column; i < column + span; i++) columnTops[i] = top + height + PREVIEW_GAP;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `masonry-preview__card${isTextCard ? ' masonry-preview__card--text' : ''}`;
    card.title = isTextCard ? 'Text card' : project.title || 'Untitled';
    Object.assign(card.style, {
      left: `${left * scale}px`,
      top: `${top * scale}px`,
      width: `${width * scale}px`,
      height: `${height * scale}px`,
    });
    if (!isTextCard && project.image) card.style.backgroundImage = `url("${encodeURI(project.image)}")`;
    const label = document.createElement('span');
    label.textContent = isTextCard ? `${index + 1} · Text` : index + 1;
    card.append(label);
    card.addEventListener('click', () => {
      const listItem = projectList.children[index];
      if (!listItem) return;
      listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      listItem.classList.add('project-list__item--highlight');
      setTimeout(() => listItem.classList.remove('project-list__item--highlight'), 1200);
    });
    masonryPreview.append(card);
  });

  masonryPreview.style.height = `${Math.max(Math.max(...columnTops) - PREVIEW_GAP, 0) * scale}px`;
};

// ===== Gallery editor =====
const el = (tag, className, props = {}) => Object.assign(document.createElement(tag), className ? { className } : {}, props);

const moveItem = (list, from, to) => {
  if (to < 0 || to >= list.length) return;
  list.splice(to, 0, list.splice(from, 1)[0]);
};

const rowControls = (list, index, onChange, label) => {
  const controls = el('div', 'gallery-controls');
  [['↑', 'Move up', () => moveItem(list, index, index - 1)],
    ['↓', 'Move down', () => moveItem(list, index, index + 1)],
    ['✕', `Remove ${label}`, () => window.confirm(`Remove this ${label}?`) && list.splice(index, 1)],
  ].forEach(([text, title, action]) => {
    const button = el('button', 'gallery-icon-button', { type: 'button', textContent: text, title });
    button.setAttribute('aria-label', title);
    button.addEventListener('click', () => { action(); onChange(); });
    controls.append(button);
  });
  return controls;
};

const labelled = (labelText, field) => {
  const label = el('label', 'gallery-field');
  label.append(labelText, field);
  return label;
};

// a card's own gallery (Illustration subcategories)
const createCardGalleryEditor = (category, title) => {
  const key = galleryKey(title);
  if (!key) {
    const details = el('details', 'gallery-editor');
    details.append(el('summary', 'gallery-editor__summary', { textContent: 'Gallery (give this card a title to add one)' }));
    return details;
  }
  return createGalleryEditor({
    editorId: `${category}/${key}`,
    label: 'Gallery',
    path: `galleries.json › ${category} › ${key}`,
    getProjects: () => galleries?.[category]?.[key]?.projects || [],
    ensureProjects: () => {
      galleries ??= {};
      galleries[category] ??= {};
      galleries[category][key] ??= { projects: [] };
      return galleries[category][key].projects;
    },
  });
};

// one gallery for a whole section; each card opens it at the project with the card's name
const createSectionGalleryEditor = category => {
  const editor = createGalleryEditor({
    editorId: `${category}/*`,
    label: 'Section gallery',
    path: `galleries.json › ${category} — cards open the project matching their title`,
    getProjects: () => galleries?.[category]?.projects || [],
    ensureProjects: () => {
      galleries ??= {};
      if (!Array.isArray(galleries[category]?.projects)) galleries[category] = { projects: [] };
      return galleries[category].projects;
    },
  });
  editor.classList.add('gallery-editor--section');
  return editor;
};

const createGalleryEditor = ({ editorId, label, path, getProjects, ensureProjects }) => {
  const details = el('details', 'gallery-editor');
  details.open = openGalleryEditors.has(editorId);
  details.addEventListener('toggle', () => {
    if (details.open) openGalleryEditors.add(editorId); else openGalleryEditors.delete(editorId);
  });
  const summary = el('summary', 'gallery-editor__summary');
  const body = el('div', 'gallery-editor__body');
  details.append(summary, body);


  const updateSummary = () => {
    const list = getProjects();
    const imageCount = list.reduce((total, galleryProject) => total + (galleryProject.images?.length || 0), 0);
    summary.textContent = `${label} · ${list.length} project${list.length === 1 ? '' : 's'} · ${imageCount} image${imageCount === 1 ? '' : 's'}`;
    const keyNote = el('span', 'gallery-editor__key', { textContent: path });
    summary.append(keyNote);
  };

  // typing saves without rebuilding (keeps focus); structural changes rebuild
  const changed = () => { saveGalleries(); updateSummary(); };
  const rebuild = () => { changed(); renderBody(); };

  const renderBody = () => {
    body.replaceChildren();
    const list = getProjects();

    list.forEach((galleryProject, projectIndex) => {
      galleryProject.images ??= [];
      const fieldset = el('fieldset', 'gallery-project');
      const header = el('div', 'gallery-project__header');
      header.append(el('legend', 'gallery-project__legend', { textContent: `Project ${projectIndex + 1}` }), rowControls(list, projectIndex, rebuild, 'project'));

      const nameInput = el('input', '', { value: galleryProject.name || '', placeholder: 'Project name' });
      nameInput.addEventListener('input', () => { galleryProject.name = nameInput.value; changed(); });
      const descriptionInput = el('textarea', '', { value: galleryProject.description || '', rows: 4, placeholder: 'Shown beside every image in this project' });
      descriptionInput.addEventListener('input', () => { galleryProject.description = descriptionInput.value; changed(); });

      // each item is an image, or { type: 'video', src: <YouTube/Vimeo/.mp4 URL>, thumb? }
      const images = el('div', 'gallery-images');
      galleryProject.images.forEach((image, imageIndex) => {
        const row = el('div', 'gallery-image');
        const preview = el('div', 'gallery-image__preview');
        const typeSelect = el('select', '');
        typeSelect.add(new Option('Image', 'image'));
        typeSelect.add(new Option('Video', 'video'));
        typeSelect.value = image.type === 'video' ? 'video' : 'image';
        const srcInput = el('input', '', { value: image.src || '' });
        const srcLabel = labelled('Image path', srcInput);
        const thumbInput = el('input', '', { value: image.thumb || '', placeholder: 'Optional image path (YouTube thumbnails are automatic)' });
        const thumbLabel = labelled('Thumbnail', thumbInput);
        thumbLabel.classList.add('gallery-image__thumb-field');
        const captionInput = el('input', '', { value: image.caption || '', placeholder: 'Image description' });

        const syncRow = () => {
          const isVideo = image.type === 'video';
          row.classList.toggle('gallery-image--video', isVideo);
          srcLabel.firstChild.textContent = isVideo ? 'Video URL' : 'Image path';
          srcInput.placeholder = isVideo ? 'https://youtu.be/… · https://vimeo.com/… · images/…/clip.mp4' : 'images/project_images/…';
          const previewSrc = isVideo ? image.thumb || videoThumb(image.src) : image.src;
          preview.style.backgroundImage = previewSrc ? `url("${encodeURI(previewSrc)}")` : '';
        };
        typeSelect.addEventListener('change', () => {
          if (typeSelect.value === 'video') image.type = 'video';
          else { delete image.type; delete image.thumb; thumbInput.value = ''; }
          syncRow(); changed();
        });
        srcInput.addEventListener('input', () => { image.src = srcInput.value.trim(); syncRow(); changed(); });
        thumbInput.addEventListener('input', () => {
          if (thumbInput.value.trim()) image.thumb = thumbInput.value.trim(); else delete image.thumb;
          syncRow(); changed();
        });
        captionInput.addEventListener('input', () => { image.caption = captionInput.value; changed(); });

        row.append(preview, labelled('Type', typeSelect), srcLabel, labelled('Caption', captionInput), rowControls(galleryProject.images, imageIndex, rebuild, 'item'), thumbLabel);
        syncRow();
        images.append(row);
      });

      const addButtons = el('div', 'gallery-add-row');
      const addImage = el('button', 'gallery-add', { type: 'button', textContent: '+ Add image' });
      addImage.addEventListener('click', () => { galleryProject.images.push({ src: '', caption: '' }); rebuild(); });
      const addVideo = el('button', 'gallery-add', { type: 'button', textContent: '+ Add video' });
      addVideo.addEventListener('click', () => { galleryProject.images.push({ type: 'video', src: '', caption: '' }); rebuild(); });
      addButtons.append(addImage, addVideo);

      fieldset.append(header, labelled('Name', nameInput), labelled('Description', descriptionInput), images, addButtons);
      body.append(fieldset);
    });

    const addProject = el('button', 'gallery-add gallery-add--project', { type: 'button', textContent: '+ Add project' });
    addProject.addEventListener('click', () => {
      ensureProjects().push({ name: '', description: '', images: [{ src: '', caption: '' }] });
      rebuild();
    });
    body.append(addProject);
  };

  updateSummary();
  renderBody();
  return details;
};

// YouTube thumbnail for a video URL (mirrors parseVideo in script.js); others need a thumbnail path
const videoThumb = url => {
  try {
    const parsed = new URL(url, window.location.href);
    const host = parsed.hostname.replace(/^(www|m)\./, '');
    const id = host === 'youtu.be'
      ? parsed.pathname.slice(1).split('/')[0]
      : (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') && (parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1]);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  } catch (error) {
    return '';
  }
};

const downloadJson = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const escapeAttribute = value => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

document.querySelector('#add-project').addEventListener('click', () => {
  projects[currentCategory()].push({ title: 'New project', image: '', alt: '', column: null, order: null, span: 1 });
  save();
  render();
});
categorySelect.addEventListener('change', render);

document.querySelector('#export-projects').addEventListener('click', () => downloadJson(projects, 'projects.json'));
document.querySelector('#export-galleries').addEventListener('click', () => downloadJson(galleries, 'galleries.json'));

document.querySelector('#import-galleries').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Invalid gallery data');
      galleries = imported;
      saveGalleries();
      render();
    } catch (error) {
      window.alert(`Could not import galleries: ${error.message}`);
    }
  });
  reader.readAsText(file);
  event.target.value = '';
});

document.querySelector('#import-projects').addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || typeof imported !== 'object') throw new Error('Invalid project data');
      projects = { ...structuredClone(defaultProjects), ...imported };
      save();
      render();
    } catch (error) {
      window.alert(`Could not import projects: ${error.message}`);
    }
  });
  reader.readAsText(file);
});

// start from galleries.json until this browser has its own edits
(async () => {
  if (!hadSavedProjects) {
    try {
      const response = await fetch('projects.json', { cache: 'no-store' });
      if (response.ok) {
        projects = { ...structuredClone(defaultProjects), ...(await response.json()) };
        save();
      }
    } catch (error) {
      // keep the built-in defaults
    }
  }
  if (!galleries) {
    try {
      const response = await fetch('galleries.json', { cache: 'no-store' });
      galleries = response.ok ? await response.json() : {};
    } catch (error) {
      galleries = {};
    }
  }
  render();
})();
window.addEventListener('resize', renderPreview);
