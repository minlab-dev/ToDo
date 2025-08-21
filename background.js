const STORAGE_KEY = "tasks";

async function getTasks() {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function setTasks(tasks) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: tasks });
}

async function updateBadge() {
  const tasks = await getTasks();
  const left = tasks.filter(t => !t.done).length;
  await chrome.action.setBadgeBackgroundColor({ color: left > 0 ? "#3b82f6" : "#666" });
  await chrome.action.setBadgeText({ text: left > 0 ? String(left) : "" });
}

chrome.runtime.onInstalled.addListener(async () => {
  const tasks = await getTasks();
  if (!Array.isArray(tasks)) {
    await setTasks([]);
  }

  chrome.contextMenus.create({
    id: "add-todo-from-selection",
    title: "할일에 추가: \"%s\"",
    contexts: ["selection"]
  });

  await updateBadge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "add-todo-from-selection") return;
  const text = (info.selectionText || "").trim();
  if (!text) return;

  let tasks = await getTasks();
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  tasks = [
    { id, text, done: false, createdAt: Date.now() },
    ...tasks
  ];
  await setTasks(tasks);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "sync" && changes[STORAGE_KEY]) {
    await updateBadge();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await updateBadge();
});


