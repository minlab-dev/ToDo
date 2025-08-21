const STORAGE_KEY = "tasks";

function getUuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function loadTasks() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function saveTasks(tasks) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: tasks });
}

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item${task.done ? " done" : ""}`;
  li.dataset.taskId = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", "완료 표시");

  const text = document.createElement("div");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger";
  deleteBtn.textContent = "삭제";
  deleteBtn.setAttribute("aria-label", "할일 삭제");

  li.appendChild(checkbox);
  li.appendChild(text);
  li.appendChild(deleteBtn);

  return li;
}

function updateCounters(tasks) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const left = total - done;
  document.getElementById("counter-total").textContent = `총 ${total}`;
  document.getElementById("counter-done").textContent = `완료 ${done}`;
  document.getElementById("counter-left").textContent = `남은 ${left}`;
}

async function render() {
  const tasks = await loadTasks();
  const list = document.getElementById("task-list");
  list.innerHTML = "";
  tasks.forEach(task => list.appendChild(createTaskElement(task)));
  updateCounters(tasks);
}

async function addTask(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return;
  const tasks = await loadTasks();
  const task = {
    id: getUuid(),
    text: trimmed,
    done: false,
    createdAt: Date.now()
  };
  tasks.unshift(task);
  await saveTasks(tasks);
}

async function toggleTask(taskId, checked) {
  const tasks = await loadTasks();
  const next = tasks.map(t => t.id === taskId ? { ...t, done: checked } : t);
  await saveTasks(next);
}

async function deleteTask(taskId) {
  const tasks = await loadTasks();
  const next = tasks.filter(t => t.id !== taskId);
  await saveTasks(next);
}

async function clearCompleted() {
  const tasks = await loadTasks();
  const next = tasks.filter(t => !t.done);
  await saveTasks(next);
}

function bindEvents() {
  const form = document.getElementById("new-task-form");
  const input = document.getElementById("new-task-input");
  const list = document.getElementById("task-list");
  const clearBtn = document.getElementById("clear-completed");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addTask(input.value);
    input.value = "";
  });

  list.addEventListener("click", async (e) => {
    const target = e.target;
    const item = target.closest(".task-item");
    if (!item) return;
    const taskId = item.dataset.taskId;

    if (target.matches("input[type=checkbox]")) {
      await toggleTask(taskId, target.checked);
    } else if (target.matches(".btn-danger")) {
      await deleteTask(taskId);
    }
  });

  clearBtn.addEventListener("click", async () => {
    await clearCompleted();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      render();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await render();
});


