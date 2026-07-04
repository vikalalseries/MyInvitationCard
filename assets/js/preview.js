import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let templates = [];
let selectedTemplate = null;
let currentUser = null;

/* ELEMENTS */
const modalImage = document.getElementById("modalImage");
const previewThumbs = document.getElementById("previewThumbs");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");
const suggestionGrid = document.getElementById("suggestionGrid");

const favoriteBtn = document.getElementById("favoriteBtn");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");

const shareTemplateBtn = document.getElementById("shareTemplateBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const reportTemplateBtn = document.getElementById("reportTemplateBtn");
const useTemplateBtn = document.getElementById("useTemplateBtn");

/* LOAD TEMPLATES */
async function loadTemplates() {
  try {
    const response = await fetch("data/templates.json");
    templates = await response.json();

    openTemplateFromURL();
  } catch (error) {
    console.error("Failed to load templates:", error);
  }
}


/* URL TEMPLATE */
function openTemplateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const templateSlug = params.get("template");

  if (!templateSlug) return;

  const template = templates.find((t) => t.slug === templateSlug);

  if (!template) return;

  openTemplate(template);
}


/* OPEN TEMPLATE */
function openTemplate(template) {
  selectedTemplate = template;

  const images =
    template.previewImages?.length
        ? template.previewImages
        : [template.thumbnail];

  modalImage.src = images[0];

  /* SIZE MODE */
  const previewSection = document.querySelector(".preview-image-section");

  if (images.length <= 1) {
    previewSection.classList.add("single-preview");
  } else {
    previewSection.classList.remove("single-preview");
  }

  modalImage.onerror = function () {
    this.src = "assets/templates/default-template.jpg";
  };

  renderPreviewThumbs(images);



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
}

function renderPreviewThumbs(images) {
  if (!previewThumbs) return;

  if (images.length <= 1) {
    previewThumbs.innerHTML = "";
    return;
  }

  previewThumbs.innerHTML = images
    .map((img, index) => `
      <div class="preview-thumb ${index === 0 ? "active" : ""}" data-img="${img}">
        <img src="${img}" alt="Preview">
      </div>
    `)
    .join("");

  document.querySelectorAll(".preview-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      modalImage.src = thumb.dataset.img;

      document.querySelectorAll(".preview-thumb").forEach((t) => {
        t.classList.remove("active");
      });

      thumb.classList.add("active");
    });
  });
}


/* SUGGESTIONS */
function renderSuggestions(template) {
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
      <div class="suggestion-card" data-slug="${template.slug}">
        <img
          src="${template.thumbnail}"
          alt="${template.title}"
          onerror="this.src='assets/templates/default-template.jpg'"
        >
      </div>
    `)
    .join("");

  document.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
      const slug = card.dataset.slug;

      window.location.search = `?template=${slug}`;
    });
  });
}


/* FAVORITES */
function getFavorites() {
  if (currentUser) {
    const scopedFavKey = `mic_favorites_${currentUser.uid}`;
    return JSON.parse(localStorage.getItem(scopedFavKey)) || [];
  }
  return JSON.parse(localStorage.getItem("favorites")) || [];
}

function updateFavoriteUI() {
  if (!selectedTemplate) return;

  const favorites = getFavorites();
  const isFav = favorites.includes(selectedTemplate.id);

  favoriteBtn.innerHTML = isFav
    ? '<i class="fa-solid fa-star"></i>'
    : '<i class="fa-regular fa-star"></i>';
}

function toggleFavorite() {
  if (!selectedTemplate) return;
  let favorites = getFavorites();

  if (favorites.includes(selectedTemplate.id)) {
    favorites = favorites.filter(id => id !== selectedTemplate.id);
  } else {
    favorites.push(selectedTemplate.id);
  }

  if (currentUser) {
    const scopedFavKey = `mic_favorites_${currentUser.uid}`;
    localStorage.setItem(scopedFavKey, JSON.stringify(favorites));
  }
  // Keep in global favorites too for consistency when logged out
  localStorage.setItem("favorites", JSON.stringify(favorites));

  updateFavoriteUI();
}


/* MENU */
function toggleMenu() {
  menuDropdown.classList.toggle("hidden");
}


/* SHARE */
async function shareTemplate() {
  const shareURL =
    `${window.location.origin}/template-dashboard.html?template=${selectedTemplate.slug}`;

  const shareData = {
    title: selectedTemplate.title,
    text: "Check out this invitation template",
    url: shareURL
  };

  if (navigator.share) {
    await navigator.share(shareData);
  } else {
    alert("Sharing not supported.");
  }
}


/* COPY LINK */
function copyTemplateLink() {
  const shareURL =
    `${window.location.origin}/template-dashboard.html?template=${selectedTemplate.slug}`;

  navigator.clipboard.writeText(shareURL);

  alert("Template link copied.");
}


/* REPORT */
function reportTemplate() {
  const reason = prompt(
    "Report reason:\nSpam / Copyright / Inappropriate"
  );

  if (reason) {
    alert("Report submitted.");
  }
}


/* USE TEMPLATE — route each template to its own builder */
const TEMPLATE_BUILDER_MAP = {
  1: "universal-template-editor/canva-editor.html",
  37: "universal-template-editor/canva-editor.html",
  38: "universal-template-editor/canva-editor.html"
  // Add future template→builder mappings here, e.g.:
  // 28: "builder2/builder.html",
};

function useTemplate() {
  if (!selectedTemplate) return;

  const builderPath = TEMPLATE_BUILDER_MAP[selectedTemplate.id];

  if (!builderPath) {
    alert(
      "Builder for \"" + selectedTemplate.title + "\" is coming soon!\n\n" +
      "We're working on it. Stay tuned."
    );
    return;
  }

  localStorage.setItem(
    "selectedTemplate",
    JSON.stringify(selectedTemplate)
  );

  window.top.location.href = builderPath + "?templateId=" + selectedTemplate.id;
}


/* EVENTS */
favoriteBtn.addEventListener("click", toggleFavorite);

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  if (menuDropdown.classList.contains("hidden")) {
    menuDropdown.classList.remove("hidden");
  } else {
    menuDropdown.classList.add("hidden");
  }
});

menuDropdown.addEventListener("click", (e) => {
  e.stopPropagation();
});

shareTemplateBtn.addEventListener("click", shareTemplate);

copyLinkBtn.addEventListener("click", copyTemplateLink);

reportTemplateBtn.addEventListener("click", reportTemplate);

useTemplateBtn.addEventListener("click", useTemplate);


/* CLOSE MENU ON OUTSIDE CLICK */
document.addEventListener(
  "click",
  () => {
    menuDropdown.classList.add("hidden");
  },
  true
);

loadTemplates();

// Listen to Auth State changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateFavoriteUI();
});




