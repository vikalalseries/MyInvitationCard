import { auth } from "./firebase-config.js";

let templates = [];
let currentTheme = "groom";
let currentEvent = "all";
let selectedTemplate = null;

/* ELEMENTS */
const templateGrid = document.getElementById("templateGrid");
const searchInput = document.getElementById("searchInput");

const quickCategory = document.getElementById("quickCategory");
const quickState = document.getElementById("quickState");
const quickStyle = document.getElementById("quickStyle");
const quickLanguage = document.getElementById("quickLanguage");

const stateFilter = document.getElementById("stateFilter");
const religionFilter = document.getElementById("religionFilter");
const styleFilter = document.getElementById("styleFilter");
const languageFilter = document.getElementById("languageFilter");

const themeButtons = document.querySelectorAll(".theme-btn");
const eventButtons = document.querySelectorAll(".event-btn");

const weddingToggle = document.getElementById("weddingToggle");
const weddingThemeSwitch = document.getElementById("weddingThemeSwitch");

const templateModal = document.getElementById("templateModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");
const suggestionGrid = document.getElementById("suggestionGrid");

const favoriteBtn = document.getElementById("favoriteBtn");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");

const shareTemplateBtn = document.getElementById("shareTemplateBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const reportTemplateBtn = document.getElementById("reportTemplateBtn");

const closeModal = document.getElementById("closeModal");
const backBtn = document.getElementById("backBtn");
const useTemplateBtn = document.getElementById("useTemplateBtn");

const importJson = document.getElementById("importJson");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");
const mobileOverlay = document.getElementById("mobileOverlay");

function requireAuth() {
  const userPanel = document.getElementById("sidebarAuthUser");

  if (userPanel.classList.contains("hidden")) {
    const authBtn = document.getElementById("openAccountAuthBtn");
    if (authBtn) authBtn.click();
    return false;
  }

  return true;
}

/* LOAD TEMPLATES */
async function loadTemplates() {
  try {
    const response = await fetch("data/templates.json");
    templates = await response.json();
    renderTemplates();
  } catch (error) {
    console.error(error);
    templateGrid.innerHTML = `
      <p style="padding:40px;">Failed to load templates.</p>
    `;
  }
}



/* RENDER */
function renderTemplates() {
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = templates.filter((template) => {
    const matchesTheme =
      currentEvent === "all"
        ? true
        : currentEvent === "wedding"
        ? template.type === currentTheme
        : true;

    const matchesEvent =
      currentEvent === "all" || template.event === currentEvent;

    const matchesCategory =
      quickCategory.value === "all" ||
      template.religion === quickCategory.value;

    const matchesState =
      quickState.value === "" ||
      template.state === quickState.value;

    const matchesStyle =
      quickStyle.value === "all" ||
      template.style === quickStyle.value;

    const matchesLanguage =
      quickLanguage.value === "all" ||
      template.language === quickLanguage.value;

    const searchableText = `
      ${template.title}
      ${template.religion}
      ${template.state}
      ${template.style}
      ${template.language}
      ${template.event}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return (
      matchesTheme &&
      matchesEvent &&
      matchesCategory &&
      matchesState &&
      matchesStyle &&
      matchesLanguage &&
      matchesSearch
    );
  });

  if (!filtered.length) {
    templateGrid.innerHTML = `
      <div style="padding:40px;font-size:18px;">
        No templates found.
      </div>
    `;
    return;
  }

  templateGrid.innerHTML = filtered
    .map(
      (template) => `
        <div class="template-card" data-id="${template.id}">
          <div class="template-image">
            <img 
              src="${template.thumbnail}" 
              alt="${template.title}"
              onerror="this.src='assets/templates/default-template.jpg'"
            >
          </div>

          <div class="template-content">
            <h3>${template.title}</h3>
          </div>
        </div>
      `
    )
    .join("");


/* WHOLE CARD CLICK */
  document.querySelectorAll(".template-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const template = templates.find((t) => t.id === id);

      openTemplateModal(template);
    });
  });
}


/* MODAL */
function openTemplateModal(template) {
  selectedTemplate = template;

  modalImage.src = template.thumbnail;
  modalImage.onerror = function () {
    this.src = "assets/templates/default-template.jpg";
  };
  modalTitle.textContent = template.title;

  modalMeta.textContent = `
    ${template.event} •
    ${template.religion} •
    ${template.state.replace(/-/g, " ")} •
    ${template.style} •
    ${template.language}
  `;

  updateFavoriteUI();
  renderSuggestions(template);

  templateModal.classList.remove("hidden");

  const previewModal = document.querySelector(".preview-modal");

  if (previewModal) {
    previewModal.scrollTop = 0;

    previewModal.onscroll = function () {
      const atBottom =
        previewModal.scrollTop + previewModal.clientHeight >=
        previewModal.scrollHeight - 5;

      previewModal.classList.toggle("at-bottom", atBottom);
    };
  }
}

/* SUGGESTIONS */
function renderSuggestions(template) {
  if (!suggestionGrid) return;

  const suggestions = templates
    .filter((t) => {
      if (t.id === template.id) return false;

      return (
        t.event === template.event &&
        t.religion === template.religion &&
        t.type === template.type
      );
    })
    .slice(0, 20);

  suggestionGrid.innerHTML = suggestions
    .map((template) => `
      <div class="suggestion-card" data-id="${template.id}">
        <img
          src="${template.thumbnail}"
          alt="${template.title}"
          onerror="this.onerror=null; this.src='assets/templates/fallback.jpg';"
        >
      </div>
    `)
    .join("");

  document.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const selected = templates.find((t) => t.id === id);

      if (selected) {
        openTemplateModal(selected);
      }
    });
  });
}

/* THEME */
function switchTheme(theme) {
  currentTheme = theme;

  if (currentEvent === "wedding") {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme",
      "default-theme"
    );

    document.body.classList.add(`${theme}-theme`);
  }

  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });

  renderTemplates();
}

/* EVENT */
function switchEvent(eventName) {
  currentEvent = eventName;

  eventButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.event === eventName);
  });

  if (eventName === "wedding") {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme",
      "default-theme"
    );

    document.body.classList.add(`${currentTheme}-theme`);

    stateFilter.style.display = "flex";
    religionFilter.style.display = "flex";
    styleFilter.style.display = "flex";
    languageFilter.style.display = "flex";
  }

  else if (eventName === "birthday") {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme"
    );

    document.body.classList.add("default-theme");

    stateFilter.style.display = "none";
    religionFilter.style.display = "none";
    styleFilter.style.display = "flex";
    languageFilter.style.display = "flex";
  }

  else {
    document.body.classList.remove(
      "groom-theme",
      "bride-theme"
    );

    document.body.classList.add("default-theme");

    stateFilter.style.display = "flex";
    religionFilter.style.display = "flex";
    styleFilter.style.display = "flex";
    languageFilter.style.display = "flex";
  }

  renderTemplates();
}

/* IMPORT JSON */
function handleImportJSON(event) {
  if (!requireAuth()) return;

  const file = event.target.files[0];

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const jsonData = JSON.parse(e.target.result);

      localStorage.setItem(
        "savedCardDesign",
        JSON.stringify(jsonData)
      );

      window.location.href = "builder.html";
    } catch {
      alert("Invalid JSON file.");
    }
  };

  reader.readAsText(file);
}

/* MOBILE */
function openSidebar() {
  sidebar.classList.add("show");
  mobileOverlay.classList.add("show");
}

function closePanels() {
  sidebar.classList.remove("show");
  mobileOverlay.classList.remove("show");
}

/* EVENTS */
themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTheme(btn.dataset.theme);
  });
});

eventButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchEvent(btn.dataset.event);

    if (btn.dataset.event === "wedding") {
      weddingThemeSwitch.classList.toggle("show");
    } else {
      weddingThemeSwitch.classList.remove("show");
    }
  });
});

searchInput.addEventListener("input", renderTemplates);
quickCategory.addEventListener("change", renderTemplates);
quickState.addEventListener("change", renderTemplates);
quickStyle.addEventListener("change", renderTemplates);
quickLanguage.addEventListener("change", renderTemplates);



if (backBtn) {
  backBtn.addEventListener("click", closeTemplateModal);
}

if (templateModal) {
  templateModal.addEventListener("click", (e) => {
    if (e.target === templateModal) {
      closeTemplateModal();
    }
  });
}

if (favoriteBtn) {
  favoriteBtn.addEventListener("click", toggleFavorite);
}

if (menuBtn) {
  menuBtn.addEventListener("click", toggleMenu);
}

if (shareTemplateBtn) {
  shareTemplateBtn.addEventListener("click", shareTemplate);
}

if (copyLinkBtn) {
  copyLinkBtn.addEventListener("click", copyTemplateLink);
}

if (reportTemplateBtn) {
  reportTemplateBtn.addEventListener("click", reportTemplate);
}

function closeTemplateModal() {
  templateModal.classList.add("hidden");

  if (menuDropdown) {
    menuDropdown.classList.add("hidden");
  }
}

function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites")) || [];
}

function updateFavoriteUI() {
  if (!selectedTemplate || !favoriteBtn) return;

  const favorites = getFavorites();
  const isFav = favorites.includes(selectedTemplate.id);

  favoriteBtn.innerHTML = isFav
    ? '<i class="fa-solid fa-star"></i>'
    : '<i class="fa-regular fa-star"></i>';
}

function toggleFavorite() {
  if (!requireAuth()) return;

  let favorites = getFavorites();

  if (favorites.includes(selectedTemplate.id)) {
    favorites = favorites.filter(id => id !== selectedTemplate.id);
  } else {
    favorites.push(selectedTemplate.id);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));

  updateFavoriteUI();
}

function toggleMenu() {
  menuDropdown.classList.toggle("hidden");
}

async function shareTemplate() {
  const shareData = {
    title: selectedTemplate.title,
    text: "Check out this invitation template",
    url: window.location.href
  };

  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    alert("Sharing not supported.");
  }
}

function copyTemplateLink() {
  navigator.clipboard.writeText(window.location.href);
  alert("Template link copied.");
}

function reportTemplate() {
  const reason = prompt(
    "Report reason:\nSpam / Copyright / Inappropriate"
  );

  if (reason) {
    alert("Report submitted.");
  }
}

if (closeModal) {
  closeModal.addEventListener("click", closeTemplateModal);
}

if (useTemplateBtn) {
  useTemplateBtn.addEventListener("click", () => {
    if (!selectedTemplate) return;

    localStorage.setItem(
      "selectedTemplate",
      JSON.stringify(selectedTemplate)
    );

    window.location.href = "builder.html";
  });
}

if (importJson) {
  importJson.addEventListener("change", handleImportJSON);
}

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", openSidebar);
}

if (mobileOverlay) {
  mobileOverlay.addEventListener("click", closePanels);
}

document.addEventListener("click", (e) => {
  if (
    menuDropdown &&
    !menuDropdown.contains(e.target) &&
    (!menuBtn || !menuBtn.contains(e.target))
  ) {
    menuDropdown.classList.add("hidden");
  }
});

/* INIT */
document.body.classList.add("default-theme");
loadTemplates();