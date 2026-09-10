const form = document.getElementById("search-form");
const input = document.getElementById("word-input");
const btn = document.getElementById("search-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const resultWordEl = document.getElementById("result-word");
const synonymsEl = document.getElementById("synonyms");
const antonymsEl = document.getElementById("antonyms");
const historyWrap = document.getElementById("history-wrap");
const historyEl = document.getElementById("history");

const HISTORY_KEY = "wordLookupHistory";
const MAX_HISTORY = 10;

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

function renderChips(container, words, kind) {
  container.innerHTML = "";
  if (!words.length) {
    const span = document.createElement("span");
    span.className = "chip empty";
    span.textContent = "None found";
    container.appendChild(span);
    return;
  }
  words.forEach((w) => {
    const chip = document.createElement("span");
    chip.className = `chip ${kind}`;
    chip.textContent = w;
    chip.addEventListener("click", () => {
      input.value = w;
      lookupWord(w);
    });
    container.appendChild(chip);
  });
}

async function fetchList(endpointParam, word) {
  const url = `https://api.datamuse.com/words?${endpointParam}=${encodeURIComponent(
    word
  )}&max=15`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  const data = await res.json();
  return data.map((item) => item.word);
}

async function lookupWord(rawWord) {
  const word = rawWord.trim().toLowerCase();
  if (!word) {
    setStatus("Type a word first.", true);
    return;
  }

  btn.disabled = true;
  setStatus("Looking up…");
  resultsEl.classList.add("hidden");

  try {
    // rel_syn = synonyms, rel_ant = antonyms (Datamuse relation codes)
    const [synonyms, antonyms] = await Promise.all([
      fetchList("rel_syn", word),
      fetchList("rel_ant", word),
    ]);

    // Datamuse's rel_syn can be sparse for some words; fall back to "means like"
    let finalSynonyms = synonyms;
    if (finalSynonyms.length === 0) {
      finalSynonyms = await fetchList("ml", word);
    }

    resultWordEl.textContent = word;
    renderChips(synonymsEl, finalSynonyms, "syn");
    renderChips(antonymsEl, antonyms, "ant");
    resultsEl.classList.remove("hidden");
    setStatus("");

    saveToHistory(word);
  } catch (err) {
    setStatus("Couldn't fetch results. Check your connection.", true);
  } finally {
    btn.disabled = false;
  }
}

function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([HISTORY_KEY], (data) => {
      resolve(data[HISTORY_KEY] || []);
    });
  });
}

function setHistory(list) {
  chrome.storage.local.set({ [HISTORY_KEY]: list });
}

async function saveToHistory(word) {
  let history = await getHistory();
  history = history.filter((w) => w !== word);
  history.unshift(word);
  history = history.slice(0, MAX_HISTORY);
  setHistory(history);
  renderHistory(history);
}

function renderHistory(history) {
  if (!history.length) {
    historyWrap.classList.add("hidden");
    return;
  }
  historyWrap.classList.remove("hidden");
  historyEl.innerHTML = "";
  history.forEach((w) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = w;
    chip.addEventListener("click", () => {
      input.value = w;
      lookupWord(w);
    });
    historyEl.appendChild(chip);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  lookupWord(input.value);
});

document.addEventListener("DOMContentLoaded", async () => {
  const history = await getHistory();
  renderHistory(history);
});
