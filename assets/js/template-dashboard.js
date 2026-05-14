const templateGrid = document.getElementById("templateGrid");
const searchInput = document.getElementById("searchInput");

const quickCategory = document.getElementById("quickCategory");
const quickStyle = document.getElementById("quickStyle");
const quickLanguage = document.getElementById("quickLanguage");
const quickState = document.getElementById("quickState");

const themeButtons = document.querySelectorAll(".theme-btn");
const eventButtons = document.querySelectorAll(".event-btn");

const filterCategories = document.querySelectorAll(".filter-category");
const filterStyles = document.querySelectorAll(".filter-style");
const filterLanguages = document.querySelectorAll(".filter-language");

const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const previewModal = document.getElementById("previewModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");

const customizeBtn = document.getElementById("customizeBtn");
const closeModal = document.getElementById("closeModal");
const backBtn = document.getElementById("backBtn");

const importJson = document.getElementById("importJson");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");

const sidebar = document.getElementById("sidebar");

const mobileOverlay = document.getElementById("mobileOverlay");

let templates = [];
let selectedTemplate = null;

let currentTheme = "groom";
let currentEvent = "all";

async function loadTemplates() {
  try {
    const response = await fetch("data/templates.json");
    templates = await response.json();
    renderTemplates();
  } catch (error) {
    templateGrid.innerHTML = `
      <p style="padding:20px;">Failed to load templates.</p>
    `;
    console.error(error);
  }
}

function getCheckedValues(nodeList) {
  return [...nodeList]
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
}

function matchesMultiFilter(itemValue, selectedValues) {
  if (selectedValues.length === 0) return true;
  return selectedValues.includes(itemValue);
}

function renderTemplates() {
  const searchTerm = searchInput.value.toLowerCase();

  const selectedCategories = getCheckedValues(filterCategories);
  const selectedStyles = getCheckedValues(filterStyles);
  const selectedLanguages = getCheckedValues(filterLanguages);

  const filtered = templates.filter((template) => {
    const matchesTheme = template.type === currentTheme;

    const matchesEvent =
      currentEvent === "all" || template.event === currentEvent;

    const matchesQuickCategory =
      quickCategory.value === "all" ||
      template.religion === quickCategory.value;

    const stateSearch = quickState.value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/&/g, "");


    const matchesQuickState =
      quickState.value = "";
      template.state === quickState.value;

    const matchesQuickStyle =
      quickStyle.value === "all" ||
      template.style === quickStyle.value;

    const matchesQuickLanguage =
      quickLanguage.value === "all" ||
      template.language === quickLanguage.value;

    const matchesCategory = matchesMultiFilter(
      template.religion,
      selectedCategories
    );

    const matchesStyle = matchesMultiFilter(
      template.style,
      selectedStyles
    );

    const matchesLanguage = matchesMultiFilter(
      template.language,
      selectedLanguages
    );

    const searchableText = `
      ${template.title}
      ${template.religion}
      ${template.style}
      ${template.language}
      ${template.event}
      ${template.type}
    `.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);

    return (
      matchesTheme &&
      matchesEvent &&
      matchesQuickCategory &&
      matchesQuickState &&
      matchesQuickStyle &&
      matchesQuickLanguage &&
      matchesSearch
    );
  });

  if (filtered.length === 0) {
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
          <img src="${template.thumbnail}" alt="${template.title}">
        </div>
        <div class="template-content">
          <h3>${template.title}</h3>
          <div class="template-tags">
            <span>${template.event}</span>
            <span>${template.religion}</span>
            <span>${template.style}</span>
            <span>${template.language}</span>
          </div>
        </div>
      </div>
    `
    )
    .join("");

  document.querySelectorAll(".template-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const template = templates.find((t) => t.id === id);
      openPreview(template);
    });
  });
}

function openPreview(template) {
  selectedTemplate = template;

  modalImage.src = template.thumbnail;
  modalTitle.textContent = template.title;
  modalMeta.textContent = `
    ${template.event} •
    ${template.religion} •
    ${template.style} •
    ${template.language}
  `;

  previewModal.classList.remove("hidden");
}

function closePreview() {
  previewModal.classList.add("hidden");
}

function switchTheme(theme) {
  currentTheme = theme;

  document.body.classList.remove("groom-theme", "bride-theme");
  document.body.classList.add(`${theme}-theme`);

  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });

  renderTemplates();
}

function switchEvent(eventName) {
  currentEvent = eventName;

  eventButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.event === eventName);
  });

  renderTemplates();
}

function clearAllFilters() {
  quickCategory.value = "all";
  quickState.value = "all";
  quickStyle.value = "all";
  quickLanguage.value = "all";

  filterCategories.forEach((cb) => (cb.checked = false));
  filterStyles.forEach((cb) => (cb.checked = false));
  filterLanguages.forEach((cb) => (cb.checked = false));

  searchInput.value = "";

  renderTemplates();
}

function handleImportJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

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
  });
});

searchInput.addEventListener("input", renderTemplates);

quickCategory.addEventListener("change", renderTemplates);
quickState.addEventListener("change", renderTemplates);
quickStyle.addEventListener("change", renderTemplates);
quickLanguage.addEventListener("change", renderTemplates);

filterCategories.forEach((cb) =>
  cb.addEventListener("change", renderTemplates)
);

filterStyles.forEach((cb) =>
  cb.addEventListener("change", renderTemplates)
);

filterLanguages.forEach((cb) =>
  cb.addEventListener("change", renderTemplates)
);

clearFiltersBtn.addEventListener("click", clearAllFilters);

closeModal.addEventListener("click", closePreview);
backBtn.addEventListener("click", closePreview);

previewModal.addEventListener("click", (e) => {
  if (e.target === previewModal) {
    closePreview();
  }
});

customizeBtn.addEventListener("click", () => {
  if (!selectedTemplate) return;

  localStorage.setItem(
    "selectedTemplate",
    JSON.stringify(selectedTemplate)
  );

  window.location.href = "builder.html";
});

importJson.addEventListener("change", handleImportJSON);

mobileMenuBtn.addEventListener("click", openSidebar);

mobileOverlay.addEventListener("click", closePanels);

/* INIT */
loadTemplates();


