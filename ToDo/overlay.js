(() => {
  const OVERLAY_ID = "todo-floating-overlay";

  function ensureStyles() {
    if (document.getElementById(`${OVERLAY_ID}-style`)) return;
    const style = document.createElement("style");
    style.id = `${OVERLAY_ID}-style`;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 20px 20px auto auto;
        width: 360px;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        background: #101317cc;
        color: #e6edf3;
        border-radius: 16px;
        backdrop-filter: blur(8px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        overflow: hidden;
        z-index: 2147483647;
      }
      #${OVERLAY_ID} header { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:#161b22; }
      #${OVERLAY_ID} header .title { font-weight:700; }
      #${OVERLAY_ID} header .controls { display:flex; gap:8px; }
      #${OVERLAY_ID} button { cursor:pointer; border-radius:8px; border:1px solid #2a2f37; background:#1f2937; color:#e6edf3; padding:6px 8px; }
      #${OVERLAY_ID} button.primary { background:#3b82f6; border-color:#3b82f6; color:#fff; }
      #${OVERLAY_ID} main { padding:8px; overflow:auto; }
      #${OVERLAY_ID} .empty { color:#a0a6ad; padding:16px; text-align:center; }
      #${OVERLAY_ID} ul { list-style:none; margin:0; padding:0; }
      #${OVERLAY_ID} li { display:grid; grid-template-columns: 22px 1fr auto; align-items:center; gap:8px; padding:8px; border-bottom:1px solid #2a2f37; }
      #${OVERLAY_ID} li:last-child { border-bottom:none; }
      #${OVERLAY_ID} .done .text { color:#a0a6ad; text-decoration: line-through; }
    `;
    document.head.appendChild(style);
  }

  async function loadTasks() {
    const { tasks } = await chrome.storage.sync.get("tasks");
    return Array.isArray(tasks) ? tasks : [];
  }

  async function saveTasks(tasks) {
    await chrome.storage.sync.set({ tasks });
  }

  function createItem(task) {
    const li = document.createElement("li");
    li.className = task.done ? "done" : "";
    li.dataset.id = task.id;
    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = task.done;
    const text = document.createElement("div");
    text.className = "text"; text.textContent = task.text;
    const del = document.createElement("button");
    del.textContent = "삭제"; del.className = "danger";
    del.addEventListener("click", async () => {
      const tasks = (await loadTasks()).filter(t => t.id !== task.id);
      await saveTasks(tasks);
    });
    cb.addEventListener("change", async () => {
      const tasks = await loadTasks();
      const next = tasks.map(t => t.id === task.id ? { ...t, done: cb.checked } : t);
      await saveTasks(next);
    });
    li.append(cb, text, del);
    return li;
  }

  async function render(container) {
    const tasks = await loadTasks();
    const list = container.querySelector("ul");
    list.innerHTML = "";
    if (!tasks.length) {
      list.innerHTML = `<div class="empty">할 일이 없습니다</div>`;
      return;
    }
    tasks.forEach(t => list.appendChild(createItem(t)));
  }

  async function mount() {
    ensureStyles();
    let root = document.getElementById(OVERLAY_ID);
    if (root) { root.remove(); return; }
    root = document.createElement("section");
    root.id = OVERLAY_ID;
    root.innerHTML = `
      <header>
        <div class="title">할일 메모</div>
        <div class="controls">
          <button id="overlay-add" class="primary">추가</button>
          <button id="overlay-close">닫기</button>
        </div>
      </header>
      <main>
        <ul></ul>
      </main>
    `;
    document.documentElement.appendChild(root);

    const addBtn = root.querySelector('#overlay-add');
    addBtn.addEventListener('click', async () => {
      const text = prompt('할 일 입력');
      const trimmed = (text || '').trim();
      if (!trimmed) return;
      const { randomUUID, getRandomValues } = crypto;
      const id = randomUUID ? randomUUID() : Array.from(getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join('');
      const tasks = await loadTasks();
      await saveTasks([{ id, text: trimmed, done:false, createdAt: Date.now() }, ...tasks]);
    });
    root.querySelector('#overlay-close').addEventListener('click', () => root.remove());

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.tasks) { render(root); }
    });

    await render(root);
  }

  // 메시지로 토글
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'TOGGLE_TODO_OVERLAY') {
      mount();
      sendResponse({ ok: true });
    }
  });
})();


