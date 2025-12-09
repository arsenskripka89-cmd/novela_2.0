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
      state.scenes = parsed.scenes || [];
      state.variables = parsed.variables || [];
      state.selectedSceneId = parsed.selectedSceneId || null;
    } catch (e) {
      console.warn('Не вдалося прочитати збережений стан', e);
    }
  }
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

    card.innerHTML = `
      <header>
        <h3>${scene.title}</h3>
        <span class="badge">${scene.choices.length} вар.</span>
      </header>
      <p class="small">${scene.text.slice(0, 80) || 'Без тексту'}${scene.text.length > 80 ? '…' : ''}</p>
      ${connections || '<p class="muted small">Немає переходів</p>'}
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
    state.scenes = parsed.scenes || [];
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
    });
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
