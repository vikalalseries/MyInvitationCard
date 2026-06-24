/* ════════════════════════════════════════════════════════════
   profile.js - Flipkart Style Profile Page Controller Logic
   ════════════════════════════════════════════════════════════ */

import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// State variables
let currentUser = null;
let selectedAvatarUrl = "";
let customAvatarBase64 = "";
let templates = [];

// DOM Elements
const guestProfileView = document.getElementById("guestProfileView");
const authProfileView = document.getElementById("authProfileView");
const guestLoginBtn = document.getElementById("guestLoginBtn");

const greetingAvatar = document.getElementById("greetingAvatar");
const greetingName = document.getElementById("greetingName");

const profileFirstName = document.getElementById("profileFirstName");
const profileLastName = document.getElementById("profileLastName");
const profileEmail = document.getElementById("profileEmail");
const profilePhone = document.getElementById("profilePhone");
const profileLanguage = document.getElementById("profileLanguage");
const profileDOB = document.getElementById("profileDOB");

// Address form elements
const addressFullName = document.getElementById("addressFullName");
const addressPhone = document.getElementById("addressPhone");
const addressPincode = document.getElementById("addressPincode");
const addressLine = document.getElementById("addressLine");
const addressCity = document.getElementById("addressCity");
const addressState = document.getElementById("addressState");
const saveAddressBtn = document.getElementById("saveAddressBtn");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const sendResetLinkBtn = document.getElementById("sendResetLinkBtn");
const customAvatarFile = document.getElementById("customAvatarFile");
const uploadedFileName = document.getElementById("uploadedFileName");

const draftsGridContainer = document.getElementById("draftsGridContainer");
const favoritesGridContainer = document.getElementById("favoritesGridContainer");
const ordersListContainer = document.getElementById("ordersListContainer");

const vlsImportFile = document.getElementById("vlsImportFile");

// Logout modal elements
const sidebarLogoutTrigger = document.getElementById("sidebarLogoutTrigger");
const logoutConfirmOverlay = document.getElementById("logoutConfirmOverlay");
const logoutConfirmModal = document.getElementById("logoutConfirmModal");
const closeLogoutConfirmModal = document.getElementById("closeLogoutConfirmModal");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");

// ── INITIALIZATION ──
document.addEventListener("DOMContentLoaded", async () => {
  // Bind tab switching
  bindTabs();

  // Load templates data
  await loadTemplatesList();

  // Listen to Firebase auth changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      setupAuthenticatedView(user);
    } else {
      currentUser = null;
      setupGuestView();
    }
  });

  // Bind input element event listeners
  bindAvatarPresets();
  bindCustomAvatarUpload();
  bindFormSubmissions();
  bindVlsImporter();
  bindLogoutModal();
});

// Load template configs
async function loadTemplatesList() {
  try {
    const res = await fetch("data/templates.json");
    if (res.ok) {
      templates = await res.json();
      if (currentUser) {
        loadFavorites(currentUser.uid);
      }
    }
  } catch (err) {
    console.error("Failed to load templates json:", err);
  }
}

// ── SET UP VIEWS ──
function setupAuthenticatedView(user) {
  guestProfileView.style.display = "none";
  authProfileView.style.display = "grid";

  // Split Display Name into First Name & Last Name
  const displayName = user.displayName?.trim() || localStorage.getItem("signupFullName")?.trim() || user.email.split("@")[0];
  const nameParts = displayName.split(" ");
  profileFirstName.value = nameParts[0] || "";
  profileLastName.value = nameParts.slice(1).join(" ") || "";
  
  profileEmail.value = user.email || "";
  greetingName.textContent = displayName;

  // Load user profile details metadata
  const metaKey = `mic_user_profile_${user.uid}`;
  let localAvatar = "";
  try {
    const metaRaw = localStorage.getItem(metaKey);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      profilePhone.value = meta.phone || "";
      profileLanguage.value = meta.language || "english";
      profileDOB.value = meta.dob || "";
      localAvatar = meta.customAvatar || meta.avatar || "";
      
      // Select Gender radio
      const gender = meta.gender || "";
      const maleRadio = document.getElementById("genderMale");
      const femaleRadio = document.getElementById("genderFemale");
      const otherRadio = document.getElementById("genderOther");
      if (maleRadio && gender === "male") maleRadio.checked = true;
      else if (femaleRadio && gender === "female") femaleRadio.checked = true;
      else if (otherRadio && gender === "other") otherRadio.checked = true;
    } else {
      profilePhone.value = "";
      profileLanguage.value = "english";
      profileDOB.value = "";
      const maleRadio = document.getElementById("genderMale");
      const femaleRadio = document.getElementById("genderFemale");
      const otherRadio = document.getElementById("genderOther");
      if (maleRadio) maleRadio.checked = false;
      if (femaleRadio) femaleRadio.checked = false;
      if (otherRadio) otherRadio.checked = false;
    }
  } catch (e) {
    console.error(e);
  }

  // Set greeting banner avatar
  const avatarToUse = localAvatar || user.photoURL || "";
  setGreetingAvatarUI(avatarToUse, displayName);

  // Load Shipping Address from localStorage
  loadShippingAddress();

  // Load tab grids
  loadSavedDrafts(user.uid);
  loadFavorites(user.uid);
  loadOrderHistory(user.uid);
}

function setupGuestView() {
  guestProfileView.style.display = "block";
  authProfileView.style.display = "none";

  if (guestLoginBtn) {
    guestLoginBtn.onclick = () => {
      const globalAuthBtn = document.getElementById("openAccountAuthBtn");
      if (globalAuthBtn) globalAuthBtn.click();
    };
  }
}

// Render banner avatar
function setGreetingAvatarUI(photoURL, name) {
  const initial = (name || "U").charAt(0).toUpperCase();
  selectedAvatarUrl = photoURL || "";
  customAvatarBase64 = "";
  uploadedFileName.textContent = "No file chosen";

  if (photoURL) {
    greetingAvatar.innerHTML = `<img src="${photoURL}" alt="avatar">`;
  } else {
    greetingAvatar.innerHTML = `<div class="avatar-initial">${initial}</div>`;
  }

  // Highlight selected preset option
  document.querySelectorAll(".avatar-option").forEach((opt) => {
    const optUrl = opt.dataset.avatarUrl;
    if (photoURL === optUrl) {
      opt.classList.add("selected");
    } else {
      opt.classList.remove("selected");
    }
  });
}

// ── BIND TAB ACTIONS ──
function bindTabs() {
  const triggers = document.querySelectorAll("[data-target]");
  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      // Clear active classes from sidebar items
      document.querySelectorAll("[data-target]").forEach((t) => {
        t.classList.remove("active");
        t.classList.remove("active-nav");
      });
      // Clear active classes from content panels
      document.querySelectorAll(".profile-tab-content").forEach((c) => {
        c.classList.remove("active");
      });

      // Apply active states
      if (trigger.classList.contains("sub-link")) {
        trigger.classList.add("active");
        // Also highlight parent headers
        const groupHeader = trigger.closest(".accordion-group")?.querySelector(".accordion-header");
        if (groupHeader) groupHeader.classList.add("active-nav");
      } else {
        trigger.classList.add("active-nav");
      }

      // Show targeted tab
      const targetId = trigger.dataset.target;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });
}

// ── AVATARS PRESET & FILE UPLOAD ──
function bindAvatarPresets() {
  document.querySelectorAll(".avatar-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".avatar-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      selectedAvatarUrl = opt.dataset.avatarUrl;
      customAvatarBase64 = "";
      uploadedFileName.textContent = "No file chosen";

      // Instantly preview in sidebar
      greetingAvatar.innerHTML = `<img src="${selectedAvatarUrl}" alt="avatar">`;
    });
  });
}

function bindCustomAvatarUpload() {
  if (!customAvatarFile) return;

  customAvatarFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      window.showToast("Image size cannot exceed 2MB.", "error");
      customAvatarFile.value = "";
      return;
    }

    uploadedFileName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      customAvatarBase64 = event.target.result;
      selectedAvatarUrl = "";

      // Clear preset badges
      document.querySelectorAll(".avatar-option").forEach((o) => o.classList.remove("selected"));

      // Preview base64 in sidebar
      greetingAvatar.innerHTML = `<img src="${customAvatarBase64}" alt="avatar">`;
    };
    reader.readAsDataURL(file);
  });
}

// ── ADDRESS MANAGEMENT ──
function loadShippingAddress() {
  try {
    const rawAddr = localStorage.getItem("mic_shipping_address");
    if (rawAddr) {
      const addr = JSON.parse(rawAddr);
      addressFullName.value = addr.fullName || "";
      addressPhone.value = addr.phone || "";
      addressPincode.value = addr.pincode || "";
      addressLine.value = addr.address || "";
      addressCity.value = addr.city || "";
      addressState.value = addr.state || "";
    } else {
      addressFullName.value = "";
      addressPhone.value = "";
      addressPincode.value = "";
      addressLine.value = "";
      addressCity.value = "";
      addressState.value = "";
    }
  } catch (e) {
    console.error(e);
  }
}

// ── SAVE & SUBMISSIONS ──
function bindFormSubmissions() {
  // Save profile info
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
      if (!currentUser) return;

      const firstName = profileFirstName.value.trim();
      const lastName = profileLastName.value.trim();
      if (!firstName) {
        window.showToast("First name is required.", "error");
        return;
      }

      const fullName = lastName ? `${firstName} ${lastName}` : firstName;

      saveProfileBtn.disabled = true;
      saveProfileBtn.textContent = "SAVING...";

      try {
        const finalAvatar = customAvatarBase64 || selectedAvatarUrl || "";
        const isBase64 = finalAvatar.startsWith("data:image/");

        // Update Firebase Auth displayName & photoURL (only pass photoURL if it's NOT base64)
        await updateProfile(auth.currentUser, {
          displayName: fullName,
          photoURL: isBase64 ? "" : finalAvatar
        });

        // Determine gender value
        let genderVal = "";
        const male = document.getElementById("genderMale");
        const female = document.getElementById("genderFemale");
        const other = document.getElementById("genderOther");
        if (male && male.checked) genderVal = "male";
        else if (female && female.checked) genderVal = "female";
        else if (other && other.checked) genderVal = "other";

        // Save profile metadata
        const metaKey = `mic_user_profile_${currentUser.uid}`;
        const metaData = {
          phone: profilePhone.value.trim(),
          language: profileLanguage.value,
          dob: profileDOB.value,
          gender: genderVal,
          customAvatar: isBase64 ? finalAvatar : ""
        };
        localStorage.setItem(metaKey, JSON.stringify(metaData));

        // Update greeting banner name
        greetingName.textContent = fullName;

        // Sync header nav popup names
        const popupName = document.getElementById("popupNavUserName");
        if (popupName) popupName.textContent = fullName;
        const sideName = document.getElementById("sidebarUserName");
        if (sideName) sideName.textContent = fullName;

        window.showToast("Profile details updated successfully!", "success");
      } catch (err) {
        console.error(err);
        window.showToast("Failed to save profile changes.", "error");
      } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "SAVE DETAILS";
      }
    });
  }

  // Save shipping address
  if (saveAddressBtn) {
    saveAddressBtn.addEventListener("click", () => {
      const name = addressFullName.value.trim();
      const phone = addressPhone.value.trim();
      const pin = addressPincode.value.trim();
      const line = addressLine.value.trim();
      const city = addressCity.value.trim();
      const state = addressState.value.trim();

      if (!name || !phone || !pin || !line || !city || !state) {
        window.showToast("Please fill all required address fields.", "error");
        return;
      }

      saveAddressBtn.disabled = true;
      saveAddressBtn.textContent = "SAVING ADDRESS...";

      try {
        const addrData = {
          fullName: name,
          phone: phone,
          pincode: pin,
          address: line,
          city: city,
          state: state
        };
        // Saves to localStorage to automatically fill print checkout inputs!
        localStorage.setItem("mic_shipping_address", JSON.stringify(addrData));
        window.showToast("Default shipping address saved successfully!", "success");
      } catch (e) {
        console.error(e);
        window.showToast("Failed to save shipping address.", "error");
      } finally {
        saveAddressBtn.disabled = false;
        saveAddressBtn.textContent = "SAVE ADDRESS";
      }
    });
  }

  // Send Reset Link
  if (sendResetLinkBtn) {
    sendResetLinkBtn.addEventListener("click", async () => {
      if (!currentUser || !currentUser.email) return;

      sendResetLinkBtn.disabled = true;
      sendResetLinkBtn.textContent = "SENDING LINK...";

      try {
        await sendPasswordResetEmail(auth, currentUser.email);
        window.showToast("Password reset link sent to your email!", "success");
      } catch (err) {
        console.error(err);
        window.showToast("Unable to send reset email.", "error");
      } finally {
        sendResetLinkBtn.disabled = false;
        sendResetLinkBtn.textContent = "RESET PASSWORD";
      }
    });
  }
}

// ── MY DRAFTS TAB MANAGER ──
function loadSavedDrafts(uid) {
  if (!draftsGridContainer) return;

  const projectKey = `mic_user_projects_${uid}`;
  let userProjects = [];
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) userProjects = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  if (!userProjects || userProjects.length === 0) {
    draftsGridContainer.innerHTML = `
      <div class="empty-placeholder">
        <i class="fa-regular fa-folder-open"></i>
        <p>No saved card designs found. Create one from the templates dashboard!</p>
      </div>
    `;
    return;
  }

  userProjects.sort((a, b) => new Date(b.lastSaved) - new Date(a.lastSaved));

  draftsGridContainer.innerHTML = userProjects
    .map((project) => {
      const lastSavedDate = new Date(project.lastSaved).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const cardThumbnail = project.thumbnail || `templates/${project.templateId}/thumbnail.jpg` || "assets/templates/default-template.jpg";

      return `
        <div class="draft-card" data-project-id="${project.id}">
          <div class="draft-card-thumb">
            <img src="${cardThumbnail}" alt="Thumbnail" onerror="this.src='assets/templates/default-template.jpg'">
            <div class="draft-card-event-badge">${project.templateId}</div>
          </div>
          <div class="draft-card-content">
            <div class="draft-rename-wrapper">
              <input type="text" class="draft-title-input" value="${project.documentTitle}" data-proj-id="${project.id}" title="Rename">
              <button class="draft-rename-btn"><i class="fa-solid fa-pen"></i></button>
            </div>
            
            <div class="draft-meta-info">
              <span>Saved: ${lastSavedDate}</span>
            </div>

            <div class="draft-actions">
              <button class="btn-draft-action primary btn-edit-draft" data-proj-id="${project.id}" data-template-id="${project.templateId}">
                <i class="fa-regular fa-pen-to-square"></i> Edit
              </button>
              <button class="btn-draft-action btn-print-draft" data-proj-id="${project.id}" data-template-id="${project.templateId}">
                <i class="fa-solid fa-print"></i> Print
              </button>
            </div>

            <div class="draft-danger-actions">
              <button class="btn-draft-danger export btn-export-draft" data-proj-id="${project.id}">
                <i class="fa-solid fa-file-export"></i> VLS Config
              </button>
              <button class="btn-draft-danger delete btn-delete-draft" data-proj-id="${project.id}">
                <i class="fa-regular fa-trash-can"></i> Delete
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Bind rename
  document.querySelectorAll(".draft-title-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const projId = e.target.dataset.projId;
      const title = e.target.value.trim();
      if (title) renameDraft(uid, projId, title);
    });
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") e.target.blur();
    });
  });

  // Bind button events
  document.querySelectorAll(".btn-edit-draft").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadDraftIntoEditor(uid, btn.dataset.projId, btn.dataset.templateId);
    });
  });

  document.querySelectorAll(".btn-print-draft").forEach((btn) => {
    btn.addEventListener("click", () => {
      loadDraftIntoPrint(uid, btn.dataset.projId, btn.dataset.templateId);
    });
  });

  document.querySelectorAll(".btn-export-draft").forEach((btn) => {
    btn.addEventListener("click", () => {
      exportDraftVls(uid, btn.dataset.projId);
    });
  });

  document.querySelectorAll(".btn-delete-draft").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteDraft(uid, btn.dataset.projId);
    });
  });
}

function renameDraft(uid, projId, newTitle) {
  const projectKey = `mic_user_projects_${uid}`;
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) {
      const userProjects = JSON.parse(raw);
      const idx = userProjects.findIndex((p) => p.id === projId);
      if (idx > -1) {
        userProjects[idx].documentTitle = newTitle;
        userProjects[idx].lastSaved = new Date().toISOString();
        localStorage.setItem(projectKey, JSON.stringify(userProjects));
        window.showToast("Draft renamed successfully!", "success");
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function loadDraftIntoEditor(uid, projId, templateId) {
  const projectKey = `mic_user_projects_${uid}`;
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) {
      const userProjects = JSON.parse(raw);
      const proj = userProjects.find((p) => p.id === projId);
      if (proj) {
        const projectData = {
          format: "VLS",
          version: "1.0",
          templateId: proj.templateId,
          documentTitle: proj.documentTitle,
          data: proj.data
        };
        localStorage.setItem("savedVlsData", JSON.stringify(projectData));
        window.location.href = `universal-template-editor/editor.html?templateId=${templateId}&projectId=${projId}`;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function loadDraftIntoPrint(uid, projId, templateId) {
  const projectKey = `mic_user_projects_${uid}`;
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) {
      const userProjects = JSON.parse(raw);
      const proj = userProjects.find((p) => p.id === projId);
      if (proj) {
        const projectData = {
          format: "VLS",
          version: "1.0",
          templateId: proj.templateId,
          documentTitle: proj.documentTitle,
          data: proj.data
        };
        localStorage.setItem("mic_print_project_data", JSON.stringify(projectData));
        localStorage.setItem("savedVlsData", JSON.stringify(projectData));
        window.location.href = `universal-template-editor/print.html?templateId=${templateId}`;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function exportDraftVls(uid, projId) {
  const projectKey = `mic_user_projects_${uid}`;
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) {
      const userProjects = JSON.parse(raw);
      const proj = userProjects.find((p) => p.id === projId);
      if (proj) {
        const vlsData = {
          format: "VLS",
          version: "1.0",
          generator: "MyInvitationCard",
          templateId: proj.templateId,
          documentTitle: proj.documentTitle,
          createdAt: proj.lastSaved,
          data: proj.data
        };
        
        const jsonString = JSON.stringify(vlsData, null, 2);
        const blob = new Blob([jsonString], { type: "application/vls+json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        const name = proj.documentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "invitation";
        link.download = `${name}.vls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        window.showToast("Project downloaded successfully!", "success");
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function deleteDraft(uid, projId) {
  if (!confirm("Delete this card design forever? This action cannot be reversed.")) return;

  const projectKey = `mic_user_projects_${uid}`;
  try {
    const raw = localStorage.getItem(projectKey);
    if (raw) {
      let userProjects = JSON.parse(raw);
      userProjects = userProjects.filter((p) => p.id !== projId);
      localStorage.setItem(projectKey, JSON.stringify(userProjects));
      window.showToast("Draft deleted successfully.", "success");
      loadSavedDrafts(uid);
    }
  } catch (e) {
    console.error(e);
  }
}

// ── VLS IMPORT ACTIONS ──
function bindVlsImporter() {
  if (!vlsImportFile) return;

  vlsImportFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const vlsData = JSON.parse(event.target.result);

        if (!vlsData || vlsData.format !== "VLS") {
          window.showToast("Invalid VLS project file format.", "error");
          return;
        }

        const projectKey = `mic_user_projects_${currentUser.uid}`;
        let userProjects = [];
        try {
          const raw = localStorage.getItem(projectKey);
          if (raw) userProjects = JSON.parse(raw);
        } catch (e) {}

        const newId = "project_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const importedProject = {
          id: newId,
          templateId: vlsData.templateId || "card1",
          documentTitle: vlsData.documentTitle || "Imported Card Design",
          lastSaved: new Date().toISOString(),
          thumbnail: `templates/${vlsData.templateId || "card1"}/thumbnail.jpg`,
          data: vlsData.data
        };

        userProjects.push(importedProject);
        localStorage.setItem(projectKey, JSON.stringify(userProjects));

        window.showToast("Card design VLS file imported successfully!", "success");
        loadSavedDrafts(currentUser.uid);
      } catch (err) {
        console.error(err);
        window.showToast("Failed to parse VLS file structure.", "error");
      } finally {
        vlsImportFile.value = "";
      }
    };
    reader.readAsText(file);
  });
}

// ── WISHLIST TAB MANAGER ──
function loadFavorites(uid) {
  if (!favoritesGridContainer) return;

  const scopedFavKey = `mic_favorites_${uid}`;
  let favorites = [];
  try {
    const scopedRaw = localStorage.getItem(scopedFavKey);
    if (scopedRaw) {
      favorites = JSON.parse(scopedRaw);
    } else {
      const genRaw = localStorage.getItem("favorites");
      if (genRaw) {
        favorites = JSON.parse(genRaw);
        localStorage.setItem(scopedFavKey, JSON.stringify(favorites));
      }
    }
  } catch (e) {
    console.error(e);
  }

  const starredTemplates = templates.filter((t) => favorites.includes(t.id));

  if (!starredTemplates || starredTemplates.length === 0) {
    favoritesGridContainer.innerHTML = `
      <div class="empty-placeholder">
        <i class="fa-regular fa-star"></i>
        <p>No starred templates. Star template cards on the dashboard to wishlist them!</p>
      </div>
    `;
    return;
  }

  favoritesGridContainer.innerHTML = starredTemplates
    .map((template) => {
      const cardThumbnail = template.thumbnail || "assets/templates/default-template.jpg";

      return `
        <div class="fav-card" data-template-id="${template.id}">
          <div class="fav-thumb">
            <img src="${cardThumbnail}" alt="${template.title}" onerror="this.src='assets/templates/default-template.jpg'">
          </div>
          <div class="fav-content">
            <div>
              <h4>${template.title}</h4>
              <div class="fav-meta">${template.event} • ${template.religion} • ${template.language}</div>
            </div>
            
            <div class="fav-btn-row">
              <button class="btn-fav-use btn-use-template" data-template-id="${template.id}" data-slug="${template.slug}">
                CUSTOMIZE
              </button>
              <button class="btn-fav-unstar btn-unstar-template" data-template-id="${template.id}" title="Remove">
                <i class="fa-solid fa-star"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  document.querySelectorAll(".btn-use-template").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = `template-dashboard.html?template=${btn.dataset.slug}`;
    });
  });

  document.querySelectorAll(".btn-unstar-template").forEach((btn) => {
    btn.addEventListener("click", () => {
      const templateId = parseInt(btn.dataset.templateId);
      unstarTemplate(uid, templateId);
    });
  });
}

function unstarTemplate(uid, templateId) {
  const scopedFavKey = `mic_favorites_${uid}`;
  try {
    let favorites = [];
    const scopedRaw = localStorage.getItem(scopedFavKey);
    if (scopedRaw) favorites = JSON.parse(scopedRaw);

    favorites = favorites.filter((id) => id !== templateId);
    localStorage.setItem(scopedFavKey, JSON.stringify(favorites));

    // Also sync to general favorites
    localStorage.setItem("favorites", JSON.stringify(favorites));

    window.showToast("Removed from wishlist.", "info");
    loadFavorites(uid);
  } catch (e) {
    console.error(e);
  }
}

// ── FLIPKART STYLE ORDERS GRID ──
function loadOrderHistory(uid) {
  if (!ordersListContainer) return;

  const orderHistoryKey = `mic_user_orders_${uid}`;
  let orderHistory = [];
  try {
    const raw = localStorage.getItem(orderHistoryKey);
    if (raw) orderHistory = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  if (!orderHistory || orderHistory.length === 0) {
    ordersListContainer.innerHTML = `
      <div class="empty-placeholder">
        <i class="fa-solid fa-receipt"></i>
        <p>No print orders placed yet. Create an invitation design and checkout to see invoice rows here.</p>
      </div>
    `;
    return;
  }

  // Sort by date descending
  orderHistory.sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0));

  ordersListContainer.innerHTML = orderHistory
    .map((order) => {
      const orderDate = new Date(order.orderDate || Date.now()).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      const templateId = order.templateId || "card1";
      const thumbnail = `templates/${templateId}/thumbnail.jpg` || "assets/templates/default-template.jpg";

      return `
        <div class="fk-order-row">
          <div class="fk-order-thumb">
            <img src="${thumbnail}" alt="Thumbnail" onerror="this.src='assets/templates/default-template.jpg'">
          </div>
          
          <div class="fk-order-details">
            <h4>${order.documentTitle || "Custom Invitation Card"}</h4>
            <div class="fk-order-specs">
              <span>Qty: ${order.quantity}</span>
              <span>Paper: ${order.paperStock}</span>
              <span>Envelope: ${order.envelopeOption}</span>
            </div>
            <div class="fk-order-specs" style="margin-top: 4px; color: var(--fk-text-gray);">
              Address: ${order.shippingAddress?.fullName}, ${order.shippingAddress?.address}, ${order.shippingAddress?.city}
            </div>
          </div>

          <div class="fk-order-price">
            ₹${parseFloat(order.grandTotal).toFixed(2)}
          </div>

          <div class="fk-order-status-col">
            <span class="status-dot"></span>
            <div>
              <strong>Delivered by ${order.deliveryDate}</strong>
              <span class="status-txt-sub">Order Reference: ${order.orderId}</span>
              <span class="status-txt-sub">Placed on: ${orderDate}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ── LOGOUT MODAL CONTROLLER ──
function bindLogoutModal() {
  if (!sidebarLogoutTrigger) return;

  function showLogout() {
    logoutConfirmOverlay.classList.add("show");
    logoutConfirmModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function hideLogout() {
    logoutConfirmOverlay.classList.remove("show");
    logoutConfirmModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  sidebarLogoutTrigger.addEventListener("click", showLogout);
  if (closeLogoutConfirmModal) closeLogoutConfirmModal.addEventListener("click", hideLogout);
  if (cancelLogoutBtn) cancelLogoutBtn.addEventListener("click", hideLogout);
  if (logoutConfirmOverlay) logoutConfirmOverlay.addEventListener("click", hideLogout);

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        localStorage.removeItem("signupFullName");
        hideLogout();
        window.showToast("Logged out successfully.", "success");
      } catch (err) {
        console.error(err);
        window.showToast("Failed to log out.", "error");
      }
    });
  }
}
