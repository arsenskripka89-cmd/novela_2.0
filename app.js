const storageKey = 'novela-workspace-state';

const state = {
  scenes: [],
  variables: [],
  selectedSceneId: null,
};

const elements = {
  scenesList: document.getElementById('scenes-list'),
  variablesList: document.getElementById('variables-list'),
  addScene: document.getElementById('add-scene'),
  addVariable: document.getElementById('add-variable'),
  inspectorBody: document.getElementById('inspector-body'),
  canvasGrid: document.getElementById('canvas-grid'),
  copyLink: document.getElementById('copy-link'),
  saveStatus: document.getElementById('save-status'),
  exportJson: document.getElementById('export-json'),
  exportHtml: document.getElementById('export-html'),
  previewBtn: document.getElementById('preview-btn'),
  helpBtn: document.getElementById('help-btn'),
  profileBtn: document.getElementById('profile-btn'),
  helpDialog: document.getElementById('help-dialog'),
  closeHelp: document.getElementById('close-help'),
  sceneDialog: document.getElementById('scene-dialog'),
  sceneForm: document.getElementById('scene-form'),
};

function uid() {
  return crypto.randomUUID();
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  elements.saveStatus.textContent = 'Збережено у браузері';
  setTimeout(() => (elements.saveStatus.textContent = ''), 2000);
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.scenes = (parsed.scenes || []).map(normalizeScene);
      state.variables = parsed.variables || [];
      state.selectedSceneId = parsed.selectedSceneId || null;
    } catch (e) {
      console.warn('Не вдалося прочитати збережений стан', e);
    }
  }
}

function normalizeScene(scene) {
  return {
    ...scene,
    text: scene.text || '',
    background: scene.background || '',
    media: scene.media || '',
    choices: scene.choices || [],
    layers: scene.layers || [],
  };
}

function selectScene(id) {
  state.selectedSceneId = id;
  render();
  saveState();
}

function addScene(scene) {
  state.scenes.push(scene);
  state.selectedSceneId = scene.id;
  render();
  saveState();
}

function updateScene(id, data) {
  const index = state.scenes.findIndex((s) => s.id === id);
  if (index === -1) return;
  state.scenes[index] = { ...state.scenes[index], ...data };
  render();
  saveState();
}

function addVariable(name) {
  if (!name.trim()) return;
  state.variables.push({ id: uid(), name: name.trim() });
  render();
  saveState();
}

function addChoice(sceneId) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const label = `Вибір ${scene.choices.length + 1}`;
  scene.choices.push({ id: uid(), label, target: null });
  render();
  saveState();
}

function deleteChoice(sceneId, choiceId) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.choices = scene.choices.filter((c) => c.id !== choiceId);
  render();
  saveState();
}

function addLayer(sceneId, type) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;

  const basePosition = { x: 12, y: 12 };
  const newLayer = {
    id: uid(),
    type,
    frameId: null,
    animation: 'none',
  };

  if (type === 'text') {
    Object.assign(newLayer, {
      label: 'Новий текст',
      color: '#f8fafc',
      fontSize: 18,
      weight: '600',
      position: { ...basePosition },
    });
  } else if (type === 'image') {
    Object.assign(newLayer, {
      label: 'Нове зображення',
      src: '',
      alt: '',
      width: 320,
      height: 180,
      position: { ...basePosition },
    });
  } else if (type === 'frame') {
    const count = scene.layers.filter((l) => l.type === 'frame').length + 1;
    Object.assign(newLayer, {
      label: `Фрейм ${count}`,
      width: 480,
      height: 320,
      position: { ...basePosition },
      visible: true,
    });
  }

  scene.layers.push(newLayer);
  render();
  saveState();
}

function deleteLayer(sceneId, layerId) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  scene.layers = scene.layers.filter((l) => l.id !== layerId);

  // При видаленні фрейму, скинемо прив'язку у елементів
  scene.layers = scene.layers.map((layer) =>
    layer.frameId === layerId ? { ...layer, frameId: null } : layer
  );

  render();
  saveState();
}

function renderScenesList() {
  elements.scenesList.innerHTML = '';
  if (!state.scenes.length) {
    elements.scenesList.innerHTML = '<p class="muted">Немає сцен. Додайте першу сцену.</p>';
    return;
  }

  state.scenes.forEach((scene) => {
    const card = document.createElement('article');
    card.className = 'card';
    if (scene.id === state.selectedSceneId) card.classList.add('active');
    card.draggable = true;
    card.dataset.id = scene.id;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', scene.id);
    });

    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      reorderScene(draggedId, scene.id);
    });

    card.innerHTML = `
      <p class="title">${scene.title}</p>
      <p class="meta">${scene.text.slice(0, 60) || 'Без опису'}${scene.text.length > 60 ? '…' : ''}</p>
      <span class="tag">${scene.choices.length} виборів</span>
    `;
    card.addEventListener('click', () => selectScene(scene.id));
    elements.scenesList.appendChild(card);
  });
}

function reorderScene(draggedId, targetId) {
  if (draggedId === targetId) return;
  const draggedIndex = state.scenes.findIndex((s) => s.id === draggedId);
  const targetIndex = state.scenes.findIndex((s) => s.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return;
  const [removed] = state.scenes.splice(draggedIndex, 1);
  state.scenes.splice(targetIndex, 0, removed);
  render();
  saveState();
}

function renderVariables() {
  elements.variablesList.innerHTML = '';
  if (!state.variables.length) {
    elements.variablesList.innerHTML = '<p class="muted">Додайте змінні для умовної логіки.</p>';
    return;
  }

  state.variables.forEach((variable) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<p class="title">${variable.name}</p>`;
    elements.variablesList.appendChild(card);
  });
}

function renderCanvas() {
  elements.canvasGrid.innerHTML = '';
  if (!state.scenes.length) {
    elements.canvasGrid.innerHTML = '<p class="muted">Додайте сцену, щоб побачити її на полотні.</p>';
    return;
  }

  state.scenes.forEach((scene) => {
    const card = document.createElement('article');
    card.className = 'canvas-card';
    card.draggable = true;
    card.dataset.id = scene.id;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', scene.id);
    });

    card.addEventListener('dragover', (e) => e.preventDefault());
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      reorderScene(draggedId, scene.id);
    });

    const connections = scene.choices
      .map((c) => `<div class="connection">→ ${c.label}${c.target ? ` → ${getSceneTitle(c.target)}` : ''}</div>`)
      .join('');

    const frames = scene.layers.filter((l) => l.type === 'frame');
    const layeredItems = scene.layers.filter((l) => l.type !== 'frame');
    const layerSummary = scene.layers.length
      ? `<p class="small muted">Елементів: ${layeredItems.length} • Фреймів: ${frames.length}</p>`
      : '<p class="muted small">Немає елементів на сцені</p>';

    card.innerHTML = `
      <header>
        <h3>${scene.title}</h3>
        <span class="badge">${scene.choices.length} вар.</span>
      </header>
      <p class="small">${scene.text.slice(0, 80) || 'Без тексту'}${scene.text.length > 80 ? '…' : ''}</p>
      ${connections || '<p class="muted small">Немає переходів</p>'}
      ${layerSummary}
    `;

    card.addEventListener('click', () => selectScene(scene.id));
    elements.canvasGrid.appendChild(card);
  });
}

function getSceneTitle(id) {
  return state.scenes.find((s) => s.id === id)?.title || '—';
}

function renderInspector() {
  const scene = state.scenes.find((s) => s.id === state.selectedSceneId);
  if (!scene) {
    elements.inspectorBody.innerHTML = '<p class="muted">Виберіть сцену, щоб розпочати редагування.</p>';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="field">
      <label>Назва сцени</label>
      <input type="text" id="scene-title" value="${scene.title}" />
    </div>
    <div class="field">
      <label>Текст сцени</label>
      <textarea id="scene-text">${scene.text}</textarea>
    </div>
    <div class="field">
      <label>Фон сцени</label>
      <input type="text" id="scene-background" value="${scene.background || ''}" placeholder="URL або опис" />
      <p class="small">Якщо фон не вказано, використовується стандартний.</p>
    </div>
    <div class="field">
      <label>Медіа</label>
      <input type="text" id="scene-media" value="${scene.media || ''}" placeholder="Посилання на зображення, аудіо чи відео" />
    </div>
    <div class="field">
      <label>Шаблон сцени</label>
      <select id="scene-template">
        <option value="">Без шаблону</option>
        <option value="intro">Вступна сцена</option>
        <option value="conflict">Розгортання конфлікту</option>
        <option value="ending">Заключна сцена</option>
      </select>
      <p class="small">Оберіть, щоб швидко замінити текст сцени.</p>
    </div>
    <hr class="divider" />
    <div class="field">
      <label>Робота з елементами</label>
      <div class="toolbar">
        <button type="button" id="add-text-layer">Додати текст</button>
        <button type="button" id="add-image-layer">Додати зображення</button>
        <button type="button" class="ghost" id="add-frame-layer">Додати фрейм</button>
      </div>
      <p class="small">Додавайте текст, зображення чи фрейми, перетворюючи сцену на багатошарову композицію.</p>
      <div id="layers-container" class="layer-list"></div>
    </div>
    <hr class="divider" />
    <div class="field">
      <label>Вибори</label>
      <div id="choices-container"></div>
      <button id="add-choice">Додати вибір</button>
    </div>
  `;

  elements.inspectorBody.innerHTML = '';
  elements.inspectorBody.appendChild(wrapper);

  wrapper.querySelector('#scene-title').addEventListener('input', (e) => {
    updateScene(scene.id, { title: e.target.value });
  });

  wrapper.querySelector('#scene-text').addEventListener('input', (e) => {
    updateScene(scene.id, { text: e.target.value });
  });

  wrapper.querySelector('#scene-background').addEventListener('input', (e) => {
    updateScene(scene.id, { background: e.target.value });
  });

  wrapper.querySelector('#scene-media').addEventListener('input', (e) => {
    updateScene(scene.id, { media: e.target.value });
  });

  const templateSelect = wrapper.querySelector('#scene-template');
  templateSelect.addEventListener('change', (e) => {
    const templates = {
      intro: 'Вас вітає наша історія. Опишіть сцену знайомства та передумови.',
      conflict: 'Герої стикаються з викликом. Опишіть дилему та ризики.',
      ending: 'Підсумуйте наслідки виборів та закрийте сюжетні арки.',
    };
    const value = e.target.value;
    if (value && templates[value]) {
      updateScene(scene.id, { text: templates[value] });
    }
  });

  const choicesContainer = wrapper.querySelector('#choices-container');
  renderChoices(choicesContainer, scene);

  const layersContainer = wrapper.querySelector('#layers-container');
  renderLayers(layersContainer, scene);

  wrapper.querySelector('#add-text-layer').addEventListener('click', () => addLayer(scene.id, 'text'));
  wrapper.querySelector('#add-image-layer').addEventListener('click', () => addLayer(scene.id, 'image'));
  wrapper.querySelector('#add-frame-layer').addEventListener('click', () => addLayer(scene.id, 'frame'));

  wrapper.querySelector('#add-choice').addEventListener('click', () => addChoice(scene.id));
}

function renderChoices(container, scene) {
  container.innerHTML = '';
  if (!scene.choices.length) {
    container.innerHTML = '<p class="muted small">Ще немає виборів.</p>';
  }

  scene.choices.forEach((choice) => {
    const row = document.createElement('div');
    row.className = 'choice-row';
    row.innerHTML = `
      <input type="text" value="${choice.label}" aria-label="Назва вибору" />
      <select aria-label="Цільова сцена">
        <option value="">Без переходу</option>
        ${state.scenes
          .map((s) => `<option value="${s.id}" ${s.id === choice.target ? 'selected' : ''}>${s.title}</option>`)
          .join('')}
      </select>
      <button class="ghost" aria-label="Видалити вибір">✕</button>
    `;

    const [labelInput, targetSelect, deleteBtn] = row.children;
    labelInput.addEventListener('input', (e) => {
      choice.label = e.target.value;
      saveState();
      render();
    });

    targetSelect.addEventListener('change', (e) => {
      choice.target = e.target.value || null;
      saveState();
      render();
    });

    deleteBtn.addEventListener('click', () => deleteChoice(scene.id, choice.id));
    container.appendChild(row);
  });
}

function renderLayers(container, scene) {
  container.innerHTML = '';

  if (!scene.layers.length) {
    container.innerHTML = '<p class="muted small">Додайте текст, зображення чи фрейм, щоб розпочати.</p>';
    return;
  }

  const frames = scene.layers.filter((l) => l.type === 'frame');

  scene.layers.forEach((layer) => {
    const card = document.createElement('article');
    card.className = 'layer-card';

    const typeLabel =
      layer.type === 'text' ? 'Текст' : layer.type === 'image' ? 'Зображення' : 'Фрейм';

    const frameSelectOptions = [
      '<option value="">Поза фреймом</option>',
      ...frames.map(
        (frame) =>
          `<option value="${frame.id}" ${frame.id === layer.frameId ? 'selected' : ''}>${frame.label}</option>`
      ),
    ].join('');

    const frameSelector =
      layer.type !== 'frame'
        ? `<label class="inline">Фрейм <select data-field="frameId">${frameSelectOptions}</select></label>`
        : '';

    const animationSelector = `
      <label class="inline">Анімація
        <select data-field="animation">
          <option value="none" ${layer.animation === 'none' ? 'selected' : ''}>Без</option>
          <option value="fade" ${layer.animation === 'fade' ? 'selected' : ''}>Поява</option>
          <option value="slide" ${layer.animation === 'slide' ? 'selected' : ''}>Зсув</option>
          <option value="scale" ${layer.animation === 'scale' ? 'selected' : ''}>Масштаб</option>
        </select>
      </label>`;

    const baseControls = `
      <header>
        <div>
          <p class="eyebrow">${typeLabel}</p>
          <input data-field="label" type="text" value="${layer.label || ''}" />
        </div>
        <button type="button" class="ghost" aria-label="Видалити" data-action="delete">✕</button>
      </header>
      <div class="layer-grid">
        <label class="inline">X <input data-field="pos-x" type="number" value="${layer.position?.x || 0}" /></label>
        <label class="inline">Y <input data-field="pos-y" type="number" value="${layer.position?.y || 0}" /></label>
        ${layer.type !== 'frame' ? animationSelector : ''}
        ${frameSelector}
      </div>
    `;

    const textControls = layer.type === 'text'
      ? `
          <label>Текст
            <textarea data-field="content">${layer.label || ''}</textarea>
          </label>
          <div class="layer-grid">
            <label class="inline">Колір <input data-field="color" type="color" value="${layer.color || '#f8fafc'}" /></label>
            <label class="inline">Розмір <input data-field="fontSize" type="number" min="10" max="72" value="${layer.fontSize || 18}" /></label>
            <label class="inline">Насиченість
              <select data-field="weight">
                ${['400', '500', '600', '700']
                  .map((weight) => `<option value="${weight}" ${weight === (layer.weight || '600') ? 'selected' : ''}>${weight}</option>`)
                  .join('')}
              </select>
            </label>
          </div>
        `
      : '';

    const imageControls = layer.type === 'image'
      ? `
          <label>Джерело зображення
            <input data-field="src" type="text" value="${layer.src || ''}" placeholder="URL або data URI" />
          </label>
          <label>Alt-текст
            <input data-field="alt" type="text" value="${layer.alt || ''}" placeholder="Опис зображення" />
          </label>
          <div class="layer-grid">
            <label class="inline">Ширина <input data-field="width" type="number" min="50" value="${layer.width || 320}" /></label>
            <label class="inline">Висота <input data-field="height" type="number" min="50" value="${layer.height || 180}" /></label>
          </div>
        `
      : '';

    const frameControls = layer.type === 'frame'
      ? `
          <div class="layer-grid">
            <label class="inline">Ширина <input data-field="width" type="number" min="120" value="${layer.width || 480}" /></label>
            <label class="inline">Висота <input data-field="height" type="number" min="120" value="${layer.height || 320}" /></label>
            <label class="inline checkbox">
              <input data-field="visible" type="checkbox" ${layer.visible !== false ? 'checked' : ''} /> Фрейм видимий
            </label>
          </div>
        `
      : '';

    card.innerHTML = `${baseControls}${textControls}${imageControls}${frameControls}`;

    card.querySelector('[data-action="delete"]').addEventListener('click', () => deleteLayer(scene.id, layer.id));

    card.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;

        if (field === 'pos-x' || field === 'pos-y') {
          const updatedPosition = {
            ...layer.position,
            x: field === 'pos-x' ? Number(value) : layer.position?.x || 0,
            y: field === 'pos-y' ? Number(value) : layer.position?.y || 0,
          };
          Object.assign(layer, { position: updatedPosition });
        } else if (field === 'frameId') {
          layer.frameId = value || null;
        } else if (field === 'visible') {
          layer.visible = !!value;
        } else if (field === 'fontSize' || field === 'width' || field === 'height') {
          layer[field] = Number(value);
        } else if (field === 'content') {
          layer.label = value;
        } else {
          layer[field] = value;
        }

        saveState();
        render();
      });
    });

    container.appendChild(card);
  });
}

function showDialog(dialog) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', 'open');
  }
}

function closeDialog(dialog) {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

function initDialogs() {
  elements.addScene.addEventListener('click', () => {
    elements.sceneForm.reset();
    showDialog(elements.sceneDialog);
  });

  elements.sceneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(elements.sceneForm);
    const title = formData.get('title').trim();
    const text = formData.get('text').trim();
    const background = formData.get('background').trim();
    if (!title || !text) return;
    addScene({
      id: uid(),
      title,
      text,
      background,
      media: '',
      choices: [],
      layers: [],
    });
    closeDialog(elements.sceneDialog);
  });

  elements.helpBtn.addEventListener('click', () => showDialog(elements.helpDialog));
  elements.closeHelp.addEventListener('click', () => closeDialog(elements.helpDialog));
  elements.profileBtn.addEventListener('click', () => {
    alert('Профіль: додайте аватар, налаштування та вихід у наступних версіях.');
  });
}

function quickSaveLink() {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  const url = new URL(window.location.href);
  url.searchParams.set('project', data);
  return url.toString();
}

function loadFromLink() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('project');
  if (!encoded) return;
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    state.scenes = (parsed.scenes || []).map(normalizeScene);
    state.variables = parsed.variables || [];
    state.selectedSceneId = parsed.selectedSceneId || null;
  } catch (e) {
    console.warn('Не вдалося імпортувати проєкт із посилання', e);
  }
}

function copyLink() {
  const link = quickSaveLink();
  navigator.clipboard
    .writeText(link)
    .then(() => {
      elements.saveStatus.textContent = 'Посилання скопійовано';
    })
    .catch(() => {
      elements.saveStatus.textContent = 'Не вдалося скопіювати';
    });
  setTimeout(() => (elements.saveStatus.textContent = ''), 2000);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'novela-project.json';
  link.click();
  URL.revokeObjectURL(url);
}

function exportHtml() {
  const html = `<!DOCTYPE html><html><body><pre>${escapeHtml(JSON.stringify(state, null, 2))}</pre></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'novela-project.html';
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

function previewProject() {
  if (!state.scenes.length) {
    alert('Додайте хоча б одну сцену для попереднього перегляду.');
    return;
  }
  const scene = state.scenes[0];
  const choices = scene.choices
    .map((c) => `• ${c.label}${c.target ? ` → ${getSceneTitle(c.target)}` : ''}`)
    .join('\n');
  alert(`Попередній перегляд:\n${scene.title}\n\n${scene.text}\n\nВибори:\n${choices || 'Немає виборів'}`);
}

function render() {
  state.scenes = state.scenes.map(normalizeScene);
  renderScenesList();
  renderVariables();
  renderCanvas();
  renderInspector();
}

function restoreFromStorage() {
  loadFromLink();
  if (!state.scenes.length) loadState();
  render();
}

function bindActions() {
  elements.addVariable.addEventListener('click', () => {
    const name = prompt('Назва зміни:');
    if (name) addVariable(name);
  });

  elements.copyLink.addEventListener('click', copyLink);
  elements.exportJson.addEventListener('click', exportJson);
  elements.exportHtml.addEventListener('click', exportHtml);
  elements.previewBtn.addEventListener('click', previewProject);
}

function bootstrap() {
  initDialogs();
  bindActions();
  restoreFromStorage();

  if (!state.scenes.length) {
    addScene({
      id: uid(),
      title: 'Вступ',
      text: 'Опишіть відкриваючу сцену та познайомте користувача зі світом.',
      background: '',
      media: '',
      choices: [],
      layers: [],
    });
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
