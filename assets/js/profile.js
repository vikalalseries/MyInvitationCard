/* ════════════════════════════════════════════════════════════
   profile.js - Flipkart Style Profile Page Controller Logic
   ════════════════════════════════════════════════════════════ */

import { auth, storage } from "./firebase-config.js";
import {
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const BACKEND_URL = "http://localhost:5000";

async function fetchUserProfile(uid) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${uid}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) return json.data;
    }
  } catch (err) {
    console.error("Failed to fetch profile from MongoDB:", err);
  }
  return null;
}

async function saveUserProfile(uid, data) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${uid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to save profile to MongoDB:", err);
    return false;
  }
}

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
const profilePhone = document.getElementById("profilePhone");
const profileLanguage = document.getElementById("profileLanguage");
const profileDOB = document.getElementById("profileDOB");

// Readonly display elements
const displayFirstName = document.getElementById("displayFirstName");
const displayLastName = document.getElementById("displayLastName");
const displayEmail = document.getElementById("displayEmail");
const displayPhone = document.getElementById("displayPhone");
const displayLanguage = document.getElementById("displayLanguage");
const displayGender = document.getElementById("displayGender");
const displayDOB = document.getElementById("displayDOB");

// Address form elements
const addressFullName = document.getElementById("full-name");
const addressPhone = document.getElementById("phone-num");
const addressEmergencyPhone = document.getElementById("emergency-phone-num");
const addressPincode = document.getElementById("pincode-input");
const addressLine1 = document.getElementById("address-line1");
const addressLine2 = document.getElementById("address-line2");
const addressCity = document.getElementById("city-input");
const addressState = document.getElementById("state-input");
const saveAddressBtn = document.getElementById("saveAddressBtn");

// Address list & form wrapper elements
const addressesListContainer = document.getElementById("addressesListContainer");
const addNewAddressBtn = document.getElementById("addNewAddressBtn");
const addressFormWrapper = document.getElementById("addressFormWrapper");
const addressFormTitle = document.getElementById("addressFormTitle");
const editAddressIndex = document.getElementById("edit-address-index");
const addressDefaultCheckbox = document.getElementById("address-default-checkbox");
const cancelAddressBtn = document.getElementById("cancelAddressBtn");

const saveAvatarBtn = document.getElementById("saveAvatarBtn");
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
async function initProfilePage() {
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
  bindAddressManager();
  bindSectionEditing();
  bindVlsImporter();
  bindLogoutModal();
  bindAccountActions();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfilePage);
} else {
  initProfilePage();
}

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
async function setupAuthenticatedView(user) {
  guestProfileView.style.display = "none";
  authProfileView.style.display = "grid";

  // Split Display Name into First Name & Last Name
  const displayName = user.displayName?.trim() || localStorage.getItem("signupFullName")?.trim() || user.email.split("@")[0];
  const nameParts = displayName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Populate edit inputs
  profileFirstName.value = firstName;
  profileLastName.value = lastName;
  
  // Populate readonly display text
  if (displayFirstName) displayFirstName.textContent = firstName || "—";
  if (displayLastName) displayLastName.textContent = lastName || "—";
  if (displayEmail) displayEmail.textContent = user.email || "—";
  
  greetingName.textContent = displayName;

  // Load Shipping Address from localStorage (temporary/fallback)
  loadShippingAddress();

  // Load tab grids
  loadSavedDrafts(user.uid);
  loadFavorites(user.uid);
  loadOrderHistory(user.uid);

  // Fetch from MongoDB
  const profile = await fetchUserProfile(user.uid);
  let localAvatar = "";
  let storedPhone = "";
  let storedLang = "english";
  let storedDob = "";
  let storedGender = "";
  let storedAddresses = null;

  if (profile) {
    storedPhone = profile.phone || "";
    storedLang = profile.language || "english";
    storedDob = profile.dob || "";
    storedGender = profile.gender || "";
    localAvatar = profile.profileImage || "";
    storedAddresses = profile.addresses || [];
  } else {
    // Fallback/Migration from localStorage
    const metaKey = `mic_user_profile_${user.uid}`;
    try {
      const raw = localStorage.getItem(metaKey);
      if (raw) {
        const meta = JSON.parse(raw);
        storedPhone = meta.phone || "";
        storedLang = meta.language || "english";
        storedDob = meta.dob || "";
        storedGender = meta.gender || "";
        localAvatar = meta.customAvatar || meta.avatar || "";
      }
    } catch (e) {}

    // Save to MongoDB so profile is initialized
    const initialAddresses = getSavedAddresses();
    await saveUserProfile(user.uid, {
      name: displayName,
      email: user.email,
      phone: storedPhone,
      language: storedLang,
      dob: storedDob,
      gender: storedGender,
      profileImage: localAvatar,
      addresses: initialAddresses
    });
  }

  if (storedAddresses) {
    // Sync addresses to localStorage for the address list UI to load
    try {
      localStorage.setItem("mic_shipping_addresses", JSON.stringify(storedAddresses));
      const defaultAddr = storedAddresses.find(a => a.isDefault) || storedAddresses[0] || null;
      if (defaultAddr) {
        localStorage.setItem("mic_shipping_address", JSON.stringify(defaultAddr));
      } else {
        localStorage.removeItem("mic_shipping_address");
      }
    } catch (e) {}
    loadShippingAddress();
  }

  // Set edit inputs
  profilePhone.value = storedPhone;
  profileLanguage.value = storedLang;
  profileDOB.value = storedDob;

  // Set gender radio
  const maleRadio = document.getElementById("genderMale");
  const femaleRadio = document.getElementById("genderFemale");
  const otherRadio = document.getElementById("genderOther");
  if (maleRadio) maleRadio.checked = storedGender === "male";
  if (femaleRadio) femaleRadio.checked = storedGender === "female";
  if (otherRadio) otherRadio.checked = storedGender === "other";

  // Set readonly display values
  if (displayPhone) displayPhone.textContent = storedPhone || "Not provided";
  const langMap = { english: "English", hindi: "Hindi (हिन्दी)" };
  if (displayLanguage) displayLanguage.textContent = langMap[storedLang] || "English";
  if (displayGender) {
    const genderMap = { male: "Male", female: "Female", other: "Other" };
    displayGender.textContent = genderMap[storedGender] || "Not specified";
  }
  if (displayDOB) {
    if (storedDob) {
      const d = new Date(storedDob + "T00:00:00");
      displayDOB.textContent = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } else {
      displayDOB.textContent = "Not set";
    }
  }

  // Close any open edit sections
  document.querySelectorAll(".editable-section.editing").forEach(s => s.classList.remove("editing"));

  // Set greeting banner avatar (check if it's base64 or a preset to determine custom badge)
  const avatarToUse = localAvatar || user.photoURL || "";
  const isCustom = !!localAvatar && !localAvatar.startsWith("assets/") && !localAvatar.startsWith("/assets/") && !localAvatar.startsWith("http");
  setGreetingAvatarUI(avatarToUse, displayName, isCustom);
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
function setGreetingAvatarUI(photoURL, name, isCustom = false) {
  const initial = (name || "U").charAt(0).toUpperCase();
  selectedAvatarUrl = isCustom ? "" : (photoURL || "");
  customAvatarBase64 = isCustom ? photoURL : "";
  uploadedFileName.textContent = isCustom ? "Custom Uploaded Photo" : "No file chosen";

  if (photoURL) {
    greetingAvatar.innerHTML = `<img src="${photoURL}" alt="avatar">`;
  } else {
    greetingAvatar.innerHTML = `<div class="avatar-initial">${initial}</div>`;
  }

  // Highlight selected preset option
  let highlighted = false;
  document.querySelectorAll(".avatar-option").forEach((opt) => {
    const optUrl = opt.dataset.avatarUrl;
    if (!isCustom && photoURL && photoURL === optUrl) {
      opt.classList.add("selected");
      highlighted = true;
    } else {
      opt.classList.remove("selected");
    }
  });

  // If no preset matched, and it's not custom, highlight "None / Gmail"
  if (!isCustom && !highlighted) {
    const noneOpt = document.querySelector('.avatar-option[data-avatar-url="none_google"]');
    if (noneOpt) {
      noneOpt.classList.add("selected");
      selectedAvatarUrl = "none_google";
    }
  }
}

// ── BIND TAB ACTIONS ──
function bindTabs() {
  const triggers = document.querySelectorAll("[data-target]");
  if (!triggers.length) return;

  const activateTab = (trigger) => {
    const targetId = trigger.dataset.target;
    if (!targetId) return;

    triggers.forEach((t) => t.classList.toggle("active-nav", t === trigger));
    document.querySelectorAll(".profile-tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === targetId);
    });
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => activateTab(trigger));
  });

  const initialTrigger = document.querySelector('.sidebar-menu-btn.active-nav[data-target]') || triggers[0];
  if (initialTrigger) {
    activateTab(initialTrigger);
  }
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
      if (selectedAvatarUrl === "none_google") {
        const googleProviderData = auth.currentUser?.providerData?.find(p => p.providerId === 'google.com');
        const googlePhotoURL = googleProviderData?.photoURL || auth.currentUser?.photoURL || "";
        const initial = (auth.currentUser?.displayName || "User").charAt(0).toUpperCase();

        if (googlePhotoURL) {
          greetingAvatar.innerHTML = `<img src="${googlePhotoURL}" alt="avatar">`;
        } else {
          greetingAvatar.innerHTML = `<div class="avatar-initial">${initial}</div>`;
        }
      } else {
        greetingAvatar.innerHTML = `<img src="${selectedAvatarUrl}" alt="avatar">`;
      }
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
function getSavedAddresses() {
  try {
    const raw = localStorage.getItem("mic_shipping_addresses");
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    console.error("Error reading mic_shipping_addresses:", e);
  }

  // Migration logic
  try {
    const oldAddr = localStorage.getItem("mic_shipping_address");
    if (oldAddr) {
      const addr = JSON.parse(oldAddr);
      if (addr && addr.fullName) {
        addr.isDefault = true;
        const addresses = [addr];
        localStorage.setItem("mic_shipping_addresses", JSON.stringify(addresses));
        return addresses;
      }
    }
  } catch (e) {
    console.error("Error migrating single address:", e);
  }

  return [];
}

function saveAddressesList(addresses) {
  try {
    localStorage.setItem("mic_shipping_addresses", JSON.stringify(addresses));
    
    // Set default one
    const defaultAddr = addresses.find(a => a.isDefault) || addresses[0] || null;
    if (defaultAddr) {
      localStorage.setItem("mic_shipping_address", JSON.stringify(defaultAddr));
    } else {
      localStorage.removeItem("mic_shipping_address");
    }
  } catch (e) {
    console.error("Error writing addresses list:", e);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function loadShippingAddress() {
  if (!addressesListContainer) return;

  const addresses = getSavedAddresses();

  // If no addresses, show placeholder
  if (addresses.length === 0) {
    addressesListContainer.innerHTML = `
      <div class="empty-placeholder" style="text-align: center; padding: 30px 20px; color: var(--fk-gray);">
        <i class="fa-regular fa-address-book" style="font-size: 40px; margin-bottom: 12px; color: #cbd5e1;"></i>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No shipping addresses saved yet.</p>
        <span style="font-size: 12px; color: #94a3b8; display: block; margin-top: 4px;">Click the ADD ADDRESS button above to add one.</span>
      </div>
    `;
    if (addNewAddressBtn) addNewAddressBtn.style.display = "flex";
    return;
  }

  // Limit check
  if (addNewAddressBtn) {
    if (addresses.length >= 3) {
      addNewAddressBtn.style.display = "none";
    } else {
      addNewAddressBtn.style.display = "flex";
    }
  }

  // Render the addresses list
  addressesListContainer.innerHTML = addresses.map((addr, idx) => {
    let lines = addr.address || "";
    if (addr.address2) {
      lines += `, ${addr.address2}`;
    }

    return `
      <div class="address-card-item ${addr.isDefault ? 'is-default' : ''}" data-index="${idx}">
        <div class="address-card-header">
          <div class="address-card-info-left">
            <input type="radio" name="defaultAddressSelector" class="address-card-radio" data-index="${idx}" ${addr.isDefault ? 'checked' : ''}>
            <span class="address-card-name">${escapeHtml(addr.fullName)}</span>
            <span class="address-card-phone">${escapeHtml(addr.phone)}</span>
            ${addr.isDefault ? '<span class="address-default-badge">DEFAULT</span>' : ''}
          </div>
          <div class="address-card-actions">
            <button type="button" class="address-action-btn edit-addr-btn" data-index="${idx}">Edit</button>
            <button type="button" class="address-action-btn delete delete-addr-btn" data-index="${idx}">Delete</button>
          </div>
        </div>
        <div class="address-card-body">
          <p>${escapeHtml(lines)}</p>
          <p><strong>Pincode:</strong> ${escapeHtml(addr.pincode)} | <strong>City:</strong> ${escapeHtml(addr.city)} | <strong>State:</strong> ${escapeHtml(addr.state)}</p>
          ${addr.emergencyPhone ? `<p><strong>Emergency Contact:</strong> ${escapeHtml(addr.emergencyPhone)}</p>` : ''}
        </div>
      </div>
    `;
  }).join("");

  // Bind radio buttons click
  addressesListContainer.querySelectorAll(".address-card-radio").forEach(radio => {
    radio.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.index);
      setDefaultAddress(idx);
    });
  });

  // Bind Edit buttons click
  addressesListContainer.querySelectorAll(".edit-addr-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      openAddressForm(idx);
    });
  });

  // Bind Delete buttons click
  addressesListContainer.querySelectorAll(".delete-addr-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      deleteAddress(idx);
    });
  });
}

async function setDefaultAddress(idx) {
  const addresses = getSavedAddresses();
  addresses.forEach((addr, i) => {
    addr.isDefault = (i === idx);
  });
  saveAddressesList(addresses);

  if (currentUser) {
    await saveUserProfile(currentUser.uid, {
      addresses: addresses
    });
  }

  loadShippingAddress();
  window.showToast("Default address updated successfully!", "success");
}

async function deleteAddress(idx) {
  if (confirm("Are you sure you want to delete this address?")) {
    let addresses = getSavedAddresses();
    const wasDefault = addresses[idx].isDefault;
    
    addresses.splice(idx, 1);
    
    // If we deleted the default address, set another default
    if (wasDefault && addresses.length > 0) {
      addresses[0].isDefault = true;
    }
    
    saveAddressesList(addresses);

    if (currentUser) {
      await saveUserProfile(currentUser.uid, {
        addresses: addresses
      });
    }

    loadShippingAddress();
    closeAddressForm();
    window.showToast("Address deleted successfully!", "success");
  }
}

function openAddressForm(idx = -1) {
  if (!addressFormWrapper) return;

  // Clear inputs
  addressFullName.value = "";
  addressPhone.value = "";
  if (addressEmergencyPhone) addressEmergencyPhone.value = "";
  addressPincode.value = "";
  addressLine1.value = "";
  addressLine2.value = "";
  addressCity.value = "";
  addressState.value = "";
  addressDefaultCheckbox.checked = false;

  if (idx >= 0) {
    // Edit existing address
    const addresses = getSavedAddresses();
    const addr = addresses[idx];
    if (addr) {
      editAddressIndex.value = idx.toString();
      addressFormTitle.textContent = "Edit Address";
      addressFullName.value = addr.fullName || "";
      addressPhone.value = addr.phone || "";
      if (addressEmergencyPhone) addressEmergencyPhone.value = addr.emergencyPhone || "";
      addressPincode.value = addr.pincode || "";
      addressLine1.value = addr.address || "";
      addressLine2.value = addr.address2 || "";
      addressCity.value = addr.city || "";
      addressState.value = addr.state || "";
      addressDefaultCheckbox.checked = !!addr.isDefault;
    }
  } else {
    // Add new address
    editAddressIndex.value = "";
    addressFormTitle.textContent = "Add New Address";
    
    const addresses = getSavedAddresses();
    if (addresses.length === 0) {
      addressDefaultCheckbox.checked = true;
      addressDefaultCheckbox.disabled = true;
    } else {
      addressDefaultCheckbox.disabled = false;
    }
  }

  addressFormWrapper.style.display = "block";
  addressFormWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeAddressForm() {
  if (addressFormWrapper) {
    addressFormWrapper.style.display = "none";
  }
}

function bindAddressManager() {
  if (addNewAddressBtn) {
    addNewAddressBtn.addEventListener("click", () => {
      const addresses = getSavedAddresses();
      if (addresses.length >= 3) {
        window.showToast("You can save a maximum of 3 shipping addresses.", "warning");
        return;
      }
      openAddressForm(-1);
    });
  }

  if (cancelAddressBtn) {
    cancelAddressBtn.addEventListener("click", () => {
      closeAddressForm();
    });
  }
}

// ── SAVE & SUBMISSIONS ──
function bindFormSubmissions() {
  // Save Avatar independently
  if (saveAvatarBtn) {
    saveAvatarBtn.addEventListener("click", async () => {
      if (!currentUser) return;

      saveAvatarBtn.disabled = true;
      saveAvatarBtn.textContent = "SAVING...";

      try {
        const finalAvatar = customAvatarBase64 || selectedAvatarUrl || "";
        const isBase64 = finalAvatar.startsWith("data:image/");

        let photoURLToUpdate = "";
        let profileImageToSave = "";

        if (finalAvatar === "none_google") {
          const googleProviderData = auth.currentUser?.providerData?.find(p => p.providerId === 'google.com');
          photoURLToUpdate = googleProviderData?.photoURL || "";
          profileImageToSave = photoURLToUpdate;
        } else if (isBase64) {
          // Upload to Firebase Storage!
          const fetchRes = await fetch(customAvatarBase64);
          const blob = await fetchRes.blob();
          const storageRef = ref(storage, `users/${currentUser.uid}/profile.jpg`);
          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);
          
          photoURLToUpdate = downloadUrl;
          profileImageToSave = downloadUrl;
        } else {
          // Preset avatar
          photoURLToUpdate = finalAvatar;
          profileImageToSave = finalAvatar;
        }

        // Update Firebase Auth photoURL
        try {
          await updateProfile(auth.currentUser, {
            photoURL: photoURLToUpdate
          });
        } catch (fbErr) {
          console.warn("Firebase profile photo update failed:", fbErr);
        }

        // Save to MongoDB
        await saveUserProfile(currentUser.uid, {
          profileImage: profileImageToSave
        });

        // Also update local cache for quick local loading
        const metaKey = `mic_user_profile_${currentUser.uid}`;
        let meta = {};
        try {
          const raw = localStorage.getItem(metaKey);
          if (raw) meta = JSON.parse(raw);
        } catch (e) {}
        meta.customAvatar = profileImageToSave;
        localStorage.setItem(metaKey, JSON.stringify(meta));

        window.showToast("Avatar updated successfully!", "success");
      } catch (err) {
        console.error(err);
        window.showToast("Failed to save avatar.", "error");
      } finally {
        saveAvatarBtn.disabled = false;
        saveAvatarBtn.textContent = "SAVE AVATAR";
      }
    });
  }

  // Save shipping address
  if (saveAddressBtn) {
    saveAddressBtn.addEventListener("click", async () => {
      const name = addressFullName.value.trim();
      const phone = addressPhone.value.trim();
      const emergencyPhone = addressEmergencyPhone?.value.trim() || "";
      const pin = addressPincode.value.trim();
      const line1 = addressLine1.value.trim();
      const line2 = addressLine2.value.trim();
      const city = addressCity.value.trim();
      const state = addressState.value.trim();
      const isDefault = addressDefaultCheckbox.checked;

      if (!name || !phone || !pin || !line1 || !city || !state) {
        window.showToast("Please fill all required address fields.", "error");
        return;
      }

      saveAddressBtn.disabled = true;
      saveAddressBtn.textContent = "SAVING ADDRESS...";

      try {
        const addrData = {
          fullName: name,
          phone: phone,
          emergencyPhone: emergencyPhone,
          pincode: pin,
          address: line1,
          address2: line2,
          city: city,
          state: state,
          isDefault: isDefault
        };

        const addresses = getSavedAddresses();
        const editIdxStr = editAddressIndex.value;

        if (editIdxStr !== "") {
          const idx = parseInt(editIdxStr);
          if (isDefault) {
            addresses.forEach((a, i) => a.isDefault = (i === idx));
          }
          addresses[idx] = addrData;
        } else {
          if (addresses.length >= 3) {
            window.showToast("You can save a maximum of 3 shipping addresses.", "error");
            return;
          }
          if (isDefault || addresses.length === 0) {
            addresses.forEach(a => a.isDefault = false);
            addrData.isDefault = true;
          }
          addresses.push(addrData);
        }

        // Save locally
        saveAddressesList(addresses);

        // Sync to MongoDB
        await saveUserProfile(currentUser.uid, {
          addresses: addresses
        });

        loadShippingAddress();
        closeAddressForm();
        window.showToast("Shipping address saved successfully!", "success");
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

// ── INLINE EDIT SECTION TOGGLING ──
function bindSectionEditing() {
  // Edit buttons
  document.querySelectorAll(".section-edit-link[data-section]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      const section = document.getElementById(`section-${sectionId}`);
      if (section) section.classList.add("editing");
    });
  });

  // Cancel buttons
  document.querySelectorAll(".btn-section-cancel[data-section]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      cancelEditSection(sectionId);
    });
  });

  // Save buttons
  document.querySelectorAll(".btn-section-save[data-section]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sectionId = btn.dataset.section;
      saveSection(sectionId);
    });
  });
}

function cancelEditSection(sectionId) {
  const section = document.getElementById(`section-${sectionId}`);
  if (!section) return;
  section.classList.remove("editing");

  // Restore input values from current readonly display
  if (!currentUser) return;

  if (sectionId === "personal") {
    // Revert inputs to stored values
    const displayName = currentUser.displayName?.trim() || currentUser.email.split("@")[0];
    const parts = displayName.split(" ");
    profileFirstName.value = parts[0] || "";
    profileLastName.value = parts.slice(1).join(" ") || "";

    // Revert gender radio
    const metaKey = `mic_user_profile_${currentUser.uid}`;
    try {
      const raw = localStorage.getItem(metaKey);
      if (raw) {
        const meta = JSON.parse(raw);
        const g = meta.gender || "";
        const m = document.getElementById("genderMale");
        const f = document.getElementById("genderFemale");
        const o = document.getElementById("genderOther");
        if (m) m.checked = g === "male";
        if (f) f.checked = g === "female";
        if (o) o.checked = g === "other";
      }
    } catch (e) {}
  } else if (sectionId === "mobile") {
    const metaKey = `mic_user_profile_${currentUser.uid}`;
    try {
      const raw = localStorage.getItem(metaKey);
      if (raw) {
        const meta = JSON.parse(raw);
        profilePhone.value = meta.phone || "";
        profileLanguage.value = meta.language || "english";
      }
    } catch (e) {}
  } else if (sectionId === "dob") {
    const metaKey = `mic_user_profile_${currentUser.uid}`;
    try {
      const raw = localStorage.getItem(metaKey);
      if (raw) {
        const meta = JSON.parse(raw);
        profileDOB.value = meta.dob || "";
      }
    } catch (e) {}
  } else if (sectionId === "address") {
    loadShippingAddress();
  }
}

async function saveSection(sectionId) {
  if (!currentUser) return;

  const metaKey = `mic_user_profile_${currentUser.uid}`;
  let meta = {};
  try {
    const raw = localStorage.getItem(metaKey);
    if (raw) meta = JSON.parse(raw);
  } catch (e) {}

  const section = document.getElementById(`section-${sectionId}`);
  const saveBtn = section?.querySelector(".btn-section-save");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";
  }

  try {
    if (sectionId === "personal") {
      const firstName = profileFirstName.value.trim();
      const lastName = profileLastName.value.trim();
      if (!firstName) {
        window.showToast("First name is required.", "error");
        return;
      }

      const fullName = lastName ? `${firstName} ${lastName}` : firstName;

      // Update Firebase Auth displayName
      try {
        await updateProfile(auth.currentUser, { displayName: fullName });
      } catch (fbErr) {
        console.warn("Firebase profile name update failed, saving locally:", fbErr);
      }

      // Determine gender
      let genderVal = "";
      const male = document.getElementById("genderMale");
      const female = document.getElementById("genderFemale");
      const other = document.getElementById("genderOther");
      if (male && male.checked) genderVal = "male";
      else if (female && female.checked) genderVal = "female";
      else if (other && other.checked) genderVal = "other";

      meta.gender = genderVal;
      localStorage.setItem(metaKey, JSON.stringify(meta));

      // Save to MongoDB
      await saveUserProfile(currentUser.uid, {
        name: fullName,
        gender: genderVal
      });

      // Update readonly display
      if (displayFirstName) displayFirstName.textContent = firstName || "—";
      if (displayLastName) displayLastName.textContent = lastName || "—";
      const genderMap = { male: "Male", female: "Female", other: "Other" };
      if (displayGender) displayGender.textContent = genderMap[genderVal] || "Not specified";

      // Update greeting
      greetingName.textContent = fullName;
      const popupName = document.getElementById("popupNavUserName");
      if (popupName) popupName.textContent = fullName;
      const sideName = document.getElementById("sidebarUserName");
      if (sideName) sideName.textContent = fullName;

      window.showToast("Personal information saved!", "success");

    } else if (sectionId === "mobile") {
      meta.phone = profilePhone.value.trim();
      meta.language = profileLanguage.value;
      localStorage.setItem(metaKey, JSON.stringify(meta));

      // Save to MongoDB
      await saveUserProfile(currentUser.uid, {
        phone: meta.phone,
        language: meta.language
      });

      // Update readonly display
      if (displayPhone) displayPhone.textContent = meta.phone || "Not provided";
      const langMap = { english: "English", hindi: "Hindi (हिन्दी)" };
      if (displayLanguage) displayLanguage.textContent = langMap[meta.language] || "English";

      window.showToast("Mobile number saved!", "success");

    } else if (sectionId === "dob") {
      meta.dob = profileDOB.value;
      localStorage.setItem(metaKey, JSON.stringify(meta));

      // Save to MongoDB
      await saveUserProfile(currentUser.uid, {
        dob: meta.dob
      });

      // Update readonly display
      if (displayDOB) {
        if (meta.dob) {
          const d = new Date(meta.dob + "T00:00:00");
          displayDOB.textContent = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        } else {
          displayDOB.textContent = "Not set";
        }
      }

      window.showToast("Date of birth saved!", "success");
    }

    // Close edit mode
    if (section) section.classList.remove("editing");

  } catch (err) {
    console.error(err);
    window.showToast("Failed to save changes.", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "SAVE";
    }
  }
}

// ── ACCOUNT ACTIONS ──
function bindAccountActions() {
  const deactivateBtn = document.getElementById("deactivateAccountBtn");
  const deleteBtn = document.getElementById("deleteAccountBtn");

  if (deactivateBtn) {
    deactivateBtn.addEventListener("click", () => {
      window.showToast("Account deactivated successfully. You will be logged out.", "success");
      setTimeout(() => {
        signOut(auth).then(() => {
          window.location.href = "index.html";
        });
      }, 1500);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) return;
      
      try {
        const user = auth.currentUser;
        if (user) {
          await user.delete();
          window.showToast("Account deleted successfully.", "success");
          setTimeout(() => {
            window.location.href = "index.html";
          }, 1500);
        }
      } catch (err) {
        console.error(err);
        if (err.code === "auth/requires-recent-login") {
          window.showToast("Please log out and log back in to delete your account.", "error");
        } else {
          window.showToast("Failed to delete account. Please try again later.", "error");
        }
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) userProjects = parsed;
    }
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
        
        // Auto-switch to drafts tab to show the imported file
        const draftsTabTrigger = document.querySelector('.sidebar-sub-link[data-target="profile-drafts-tab"]');
        if (draftsTabTrigger) {
          draftsTabTrigger.click();
        }
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
      const parsed = JSON.parse(scopedRaw);
      if (Array.isArray(parsed)) favorites = parsed;
    } else {
      const genRaw = localStorage.getItem("favorites");
      if (genRaw) {
        const parsed = JSON.parse(genRaw);
        if (Array.isArray(parsed)) {
          favorites = parsed;
          localStorage.setItem(scopedFavKey, JSON.stringify(favorites));
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  if (!Array.isArray(favorites)) {
    favorites = [];
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) orderHistory = parsed;
    }
  } catch (e) {
    console.error(e);
  }

  if (!Array.isArray(orderHistory)) {
    orderHistory = [];
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
