import { auth, googleProvider } from "./firebase-config.js";

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const toastMessage = document.getElementById("toastMessage");

function showToast(message, type = "success") {
  if (!toastMessage) return;
  toastMessage.textContent = message;
  toastMessage.className = `custom-toast show ${type}`;

  setTimeout(() => {
    toastMessage.className = "custom-toast";
  }, 3500);
}

window.showToast = showToast;


const authModal = document.getElementById("authModal");
const authOverlay = document.getElementById("authOverlay");
const closeAuthModal = document.getElementById("closeAuthModal");

const authWelcome = document.getElementById("authWelcome");
const authLoginForm = document.getElementById("authLoginForm");
const authSignupForm = document.getElementById("authSignupForm");

const authOtpForm = document.getElementById("authOtpForm");
const authResetForm = document.getElementById("authResetForm");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const backToSignupBtn = document.getElementById("backToSignupBtn");

const resendOtpBtn = document.getElementById("resendOtpBtn");
const resendOtpText = document.getElementById("resendOtpText");

const googleLoginBtn = document.getElementById("googleLoginBtn");
const openEmailLoginBtn = document.getElementById("openEmailLoginBtn");

const openSignupLink = document.getElementById("openSignupLink");
const backToWelcomeBtn = document.getElementById("backToWelcomeBtn");
const backToWelcomeBtn2 = document.getElementById("backToWelcomeBtn2");
const openLoginLink = document.getElementById("openLoginLink");

const loginEmailBtn = document.getElementById("loginEmailBtn");
const signupEmailBtn = document.getElementById("signupEmailBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const sendResetBtn = document.getElementById("sendResetBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");

const sidebarAuthGuest = document.getElementById("sidebarAuthGuest");
const sidebarAuthUser = document.getElementById("sidebarAuthUser");

const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const logoutBtn = document.getElementById("logoutBtn");
const openAccountAuthBtn = document.getElementById("openAccountAuthBtn");
const openAccountAuthBtnMobile = document.getElementById("openAccountAuthBtnMobile");
const openSignupDirectBtn = document.getElementById("openSignupDirectBtn");

const navLoggedOut = document.getElementById("navLoggedOut");
const navLoggedIn = document.getElementById("navLoggedIn");

const navAvatar = document.getElementById("navAvatar");
const navUserMenuBtn = document.getElementById("navUserMenuBtn");
const navUserPopup = document.getElementById("navUserPopup");
const logoutBtnNavbar = document.getElementById("logoutBtnNavbar");

const mobileNavUserMenuBtn = document.getElementById("mobileNavUserMenuBtn");
const mobileNavUserPopup = document.getElementById("mobileNavUserPopup");
const mobilePopupNavAvatar = document.getElementById("mobilePopupNavAvatar");
const mobilePopupNavUserName = document.getElementById("mobilePopupNavUserName");
const mobilePopupNavUserEmail = document.getElementById("mobilePopupNavUserEmail");
const mobileMenuLoggedOut = document.getElementById("mobileMenuLoggedOut");
const mobileMenuLoggedIn = document.getElementById("mobileMenuLoggedIn");
const mobileMenuAvatar = document.getElementById("mobileMenuAvatar");
const mobileMenuUserName = document.getElementById("mobileMenuUserName");
const mobileMenuUserEmail = document.getElementById("mobileMenuUserEmail");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
const mobileLogoutBtnNavbar = document.getElementById("mobileLogoutBtnNavbar");
const mobileMenu = document.getElementById("mobileMenu");

let pendingSignupEmail = "";
let pendingSignupPassword = "";
let resendCountdown;

function showModal() {
  authOverlay.classList.add("show");
  authModal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideModal() {
  authOverlay.classList.remove("show");
  authModal.classList.remove("show");
  document.body.style.overflow = "auto";
}

function showWelcome() {
  authWelcome.classList.remove("hidden");
  authLoginForm.classList.add("hidden");
  authSignupForm.classList.add("hidden");
  authOtpForm.classList.add("hidden");
  authResetForm.classList.add("hidden");
}

function showLoginForm() {
  authWelcome.classList.add("hidden");
  authLoginForm.classList.remove("hidden");
  authSignupForm.classList.add("hidden");
  authOtpForm.classList.add("hidden");
  authResetForm.classList.add("hidden");
}

function showSignupForm() {
  authWelcome.classList.add("hidden");
  authLoginForm.classList.add("hidden");
  authSignupForm.classList.remove("hidden");
  authOtpForm.classList.add("hidden");
  authResetForm.classList.add("hidden");
}

function showOtpForm() {
  authWelcome.classList.add("hidden");
  authLoginForm.classList.add("hidden");
  authSignupForm.classList.add("hidden");
  authOtpForm.classList.remove("hidden");
  authResetForm.classList.add("hidden");
}

function showResetForm() {
  authWelcome.classList.add("hidden");
  authLoginForm.classList.add("hidden");
  authSignupForm.classList.add("hidden");
  authOtpForm.classList.add("hidden");
  authResetForm.classList.remove("hidden");
}

function startResendTimer() {
  let seconds = 30;

  resendOtpBtn.disabled = true;
  resendOtpBtn.textContent = `Resend OTP (${seconds}s)`;

  clearInterval(resendCountdown);

  resendCountdown = setInterval(() => {
    seconds--;

    resendOtpBtn.textContent = `Resend OTP (${seconds}s)`;

    if (seconds <= 0) {
      clearInterval(resendCountdown);
      resendOtpBtn.disabled = false;
      resendOtpBtn.textContent = "Resend OTP";
    }
  }, 1000);
}

if (backToSignupBtn) {
  backToSignupBtn.addEventListener("click", showSignupForm);
}



if (closeAuthModal) {
  closeAuthModal.addEventListener("click", hideModal);
}

if (authOverlay) {
  authOverlay.addEventListener("click", hideModal);
}

if (openAccountAuthBtn) {
  openAccountAuthBtn.addEventListener("click", () => {
    showModal();
    showWelcome();
  });
}

if (openAccountAuthBtnMobile) {
  openAccountAuthBtnMobile.addEventListener("click", (e) => {
    e.preventDefault();
    showModal();
    showWelcome();
  });
}

if (openSignupDirectBtn) {
  openSignupDirectBtn.addEventListener("click", () => {
    showModal();
    showSignupForm();
  });
}

if (openSignupLink) {
  openSignupLink.addEventListener("click", showSignupForm);
}

if (openLoginLink) {
  openLoginLink.addEventListener("click", showLoginForm);
}

if (backToWelcomeBtn) {
  backToWelcomeBtn.addEventListener("click", showWelcome);
}

if (backToWelcomeBtn2) {
  backToWelcomeBtn2.addEventListener("click", showWelcome);
}


if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      hideModal();
    } catch (error) {
      if (error.code !== "auth/popup-closed-by-user") {
        showToast("Google login failed. Please try again.", "error");
      }
    }
  });
}


if (loginEmailBtn) {
  loginEmailBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      showToast("Please fill all fields.", "error");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      hideModal();
    } catch (error) {
      showToast("Incorrect email or password.", "error");
    }
  });
}


if (signupEmailBtn) {
  signupEmailBtn.addEventListener("click", async () => {
    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("signupConfirmPassword").value;

    if (!fullName || !email || !password || !confirmPassword) {
      showToast("Please fill all fields.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    try {
      const response = await fetch("https://myinvitationcard-backend.onrender.com/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          email,
          password
        })
      });

      const data = await response.json();

      if (!data.success) {
        showToast(data.message, "error");
        return;
      }

      pendingSignupEmail = email;
      pendingSignupPassword = password;

      showToast("Verification code sent to your email.", "success");
      showOtpForm();
      startResendTimer();

    } catch (error) {
      showToast("Unable to send verification code. Please try again.", "error");
    }
  });
}

if (resendOtpBtn) {
  resendOtpBtn.addEventListener("click", async () => {
    try {
      const fullName = document.getElementById("signupName").value.trim();

      const response = await fetch("https://myinvitationcard-backend.onrender.com/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          email: pendingSignupEmail,
          password: pendingSignupPassword
        })
      });

      const data = await response.json();

      if (!data.success) {
        showToast(data.message, "error");
        return;
      }

      showToast("New verification code sent.", "success");
      startResendTimer();

    } catch (error) {
      showToast("Failed to resend OTP.", "error");
    }
  });
}


if (verifyOtpBtn) {
  verifyOtpBtn.addEventListener("click", async () => {
    const otp = document.getElementById("otpCode").value.trim();

    if (!otp) {
      showToast("Enter verification code.", "error");
      return;
    }

    try {
      const response = await fetch("https://myinvitationcard-backend.onrender.com/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: pendingSignupEmail,
          otp
        })
      });

      const data = await response.json();

      if (!data.success) {
        showToast(data.message, "error");
        return;
      }

      await signInWithEmailAndPassword(
        auth,
        pendingSignupEmail,
        pendingSignupPassword
      );

      localStorage.setItem(
        "signupFullName",
        document.getElementById("signupName").value.trim()
      );

      document.getElementById("signupName").value = "";
      document.getElementById("signupEmail").value = "";
      document.getElementById("signupPassword").value = "";
      document.getElementById("signupConfirmPassword").value = "";
      document.getElementById("otpCode").value = "";

      pendingSignupEmail = "";
      pendingSignupPassword = "";

      clearInterval(resendCountdown);

      showToast("Welcome to MyInvitationCard!", "success");

      hideModal();
      showWelcome();

    } catch (error) {
      showToast("Verification failed. Please try again.", "error");
    }
  });
}


if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", showResetForm);
}


if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    if (document.getElementById("logoutConfirmModal")) {
      e.stopPropagation();
      showGlobalLogoutConfirm();
      return;
    }
    await signOut(auth);
  });
}

if (logoutBtnNavbar) {
  logoutBtnNavbar.addEventListener("click", async (e) => {
    if (document.getElementById("logoutConfirmModal")) {
      e.stopPropagation();
      showGlobalLogoutConfirm();
      return;
    }
    await signOut(auth);
  });
}

if (mobileLogoutBtn) {
  mobileLogoutBtn.addEventListener("click", async (e) => {
    if (document.getElementById("logoutConfirmModal")) {
      e.stopPropagation();
      showGlobalLogoutConfirm();
      return;
    }
    await signOut(auth);
  });
}

window.logout = async function () {
  await signOut(auth);
};

if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", showLoginForm);
}

if (sendResetBtn) {
  sendResetBtn.addEventListener("click", async () => {
    const email = document.getElementById("resetEmail").value.trim();

    if (!email) {
      showToast("Enter your email address.", "error");
      return;
    }

    sendResetBtn.disabled = true;
    sendResetBtn.textContent = "Sending...";

    try {
      await sendPasswordResetEmail(auth, email);

      showToast("Password reset link sent to your email.", "success");

      document.getElementById("resetEmail").value = "";

      setTimeout(() => {
        showLoginForm();
      }, 1200);

    } catch (error) {
      showToast("Unable to send reset email.", "error");
    }

    sendResetBtn.disabled = false;
    sendResetBtn.textContent = "Send Reset Link";
  });
}


onAuthStateChanged(auth, (user) => {

  if (user) {

    /* TEMPLATE DASHBOARD SIDEBAR */
    const loggedOutSection = document.getElementById("loggedOutSection");
    const loggedInSection = document.getElementById("loggedInSection");
    const sidebarUserName = document.getElementById("sidebarUserName");
    const popupUserName = document.getElementById("popupUserName");
    const popupUserEmail = document.getElementById("popupUserEmail");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const popupAvatar = document.getElementById("popupAvatar");

    const popupNavAvatar = document.getElementById("popupNavAvatar");
    const popupNavUserName = document.getElementById("popupNavUserName");
    const popupNavUserEmail = document.getElementById("popupNavUserEmail");

    if (loggedOutSection) loggedOutSection.style.display = "none";
    if (loggedInSection) loggedInSection.style.display = "block";

    const displayName =
      user.displayName?.trim() ||
      localStorage.getItem("signupFullName")?.trim() ||
      user.email.split("@")[0];

    if (sidebarUserName) sidebarUserName.textContent = displayName;
    if (popupNavUserName) {
      popupNavUserName.textContent = displayName || "My Account";
    }
    if (popupNavUserEmail) {
      popupNavUserEmail.textContent = user.email || "No email";
    }

    if (mobilePopupNavUserName) {
      mobilePopupNavUserName.textContent = displayName || "My Account";
    }

    if (mobilePopupNavUserEmail) {
      mobilePopupNavUserEmail.textContent = user.email || "No email";
    }

    if (mobileMenuUserName) {
      mobileMenuUserName.textContent = displayName || "My Account";
    }

    if (mobileMenuUserEmail) {
      mobileMenuUserEmail.textContent = user.email || "No email";
    }

    if (mobileNavUserMenuBtn) {
      mobileNavUserMenuBtn.style.display = "flex";
    }

    if (mobileMenuLoggedOut) {
      mobileMenuLoggedOut.style.display = "none";
    }

    if (mobileMenuLoggedIn) {
      mobileMenuLoggedIn.style.display = "flex";
    }

    let localAvatar = "";
    try {
      const metaRaw = localStorage.getItem(`mic_user_profile_${user.uid}`);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        localAvatar = meta.customAvatar || meta.avatar || "";
      }
    } catch (e) {}

    const avatarUrl = localAvatar || user.photoURL;

    if (avatarUrl) {
      if (sidebarAvatar) {
        sidebarAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
      }

      if (popupAvatar) {
        popupAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
      }

      if (navAvatar) {
        navAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
      }

      if (popupNavAvatar) {
        popupNavAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
      }

      if (mobilePopupNavAvatar) {
        mobilePopupNavAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
      }

      if (mobileMenuAvatar) {
        mobileMenuAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
      }

      if (mobileNavUserMenuBtn) {
        const avatar = mobileNavUserMenuBtn.querySelector(".mobile-nav-avatar");
        if (avatar) {
          avatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
        }
      }

    } else {
      const initial = displayName.charAt(0).toUpperCase();

      const avatarHTML = `
        <div class="avatar-initial">${initial}</div>
      `;

      if (navAvatar) navAvatar.innerHTML = avatarHTML;
      if (popupNavAvatar) popupNavAvatar.innerHTML = avatarHTML;
      if (mobilePopupNavAvatar) mobilePopupNavAvatar.innerHTML = avatarHTML;
      if (mobileMenuAvatar) mobileMenuAvatar.innerHTML = avatarHTML;
      if (mobileNavUserMenuBtn) {
        const avatar = mobileNavUserMenuBtn.querySelector(".mobile-nav-avatar");
        if (avatar) avatar.innerHTML = avatarHTML;
      }
    }


    /* HOMEPAGE NAVBAR */
    if (navLoggedOut) navLoggedOut.style.display = "none";
    if (navLoggedIn) navLoggedIn.style.display = "flex";

  } else {

    /* TEMPLATE DASHBOARD SIDEBAR */
    const loggedOutSection = document.getElementById("loggedOutSection");
    const loggedInSection = document.getElementById("loggedInSection");

    if (loggedOutSection) loggedOutSection.style.display = "block";
    if (loggedInSection) loggedInSection.style.display = "none";

    /* HOMEPAGE NAVBAR */
    if (navLoggedOut) navLoggedOut.style.display = "flex";
    if (navLoggedIn) navLoggedIn.style.display = "none";

    if (mobileNavUserMenuBtn) {
      mobileNavUserMenuBtn.style.display = "none";
    }

    if (mobileNavUserPopup) {
      mobileNavUserPopup.classList.remove("show");
    }

    if (mobileMenuLoggedOut) {
      mobileMenuLoggedOut.style.display = "flex";
    }

    if (mobileMenuLoggedIn) {
      mobileMenuLoggedIn.style.display = "none";
    }
  }

});



/* DESKTOP PROFILE POPUP */
if (navUserMenuBtn && navUserPopup) {
  navUserMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navUserPopup.classList.toggle("show");
  });

  navUserPopup.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

/* MOBILE PROFILE POPUP */
if (mobileNavUserMenuBtn && mobileNavUserPopup) {
  mobileNavUserMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (mobileMenu) {
      mobileMenu.classList.remove("open");
    }

    mobileNavUserPopup.classList.toggle("show");
  });

  mobileNavUserPopup.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

/* CLICK ANYWHERE OUTSIDE TO CLOSE */
document.addEventListener("click", () => {
  if (navUserPopup) {
    navUserPopup.classList.remove("show");
  }

  if (mobileNavUserPopup) {
    mobileNavUserPopup.classList.remove("show");
  }
});








document.addEventListener(
  "click",
  () => {
    console.log("OUTSIDE CLICK");
    if (navUserPopup) {
      navUserPopup.classList.remove("show");
    }
  },
  true
);

// Check query parameters to open login/signup forms automatically
if (authOverlay && authModal) {
  const urlParams = new URLSearchParams(window.location.search);
  let opened = false;
  if (urlParams.get('openLogin') === 'true') {
    showModal();
    showLoginForm();
    opened = true;
  } else if (urlParams.get('openSignup') === 'true') {
    showModal();
    showSignupForm();
    opened = true;
  }
  if (opened) {
    // Clean up query parameters from the browser's address bar
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}

// Global Logout Confirmation Popup Handlers (for index page and dashboard page)
const logoutConfirmOverlay = document.getElementById("logoutConfirmOverlay");
const logoutConfirmModal = document.getElementById("logoutConfirmModal");
const closeLogoutConfirmModal = document.getElementById("closeLogoutConfirmModal");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");

function showGlobalLogoutConfirm() {
  if (navUserPopup) navUserPopup.classList.remove("show");
  if (logoutConfirmOverlay) logoutConfirmOverlay.classList.add("show");
  if (logoutConfirmModal) logoutConfirmModal.classList.add("show");
}

function hideGlobalLogoutConfirm() {
  if (logoutConfirmOverlay) logoutConfirmOverlay.classList.remove("show");
  if (logoutConfirmModal) logoutConfirmModal.classList.remove("show");
}

if (closeLogoutConfirmModal) {
  closeLogoutConfirmModal.addEventListener("click", hideGlobalLogoutConfirm);
}
if (cancelLogoutBtn) {
  cancelLogoutBtn.addEventListener("click", hideGlobalLogoutConfirm);
}
if (logoutConfirmOverlay) {
  logoutConfirmOverlay.addEventListener("click", hideGlobalLogoutConfirm);
}
if (confirmLogoutBtn) {
  confirmLogoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("signupFullName");
      hideGlobalLogoutConfirm();
    } catch (err) {
      console.error(err);
    }
  });
}

// Bind click listeners for "My Profile" popup buttons globally
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".popup-menu-btn, .sidebar-popup-item");
  if (btn && btn.textContent.includes("My Profile")) {
    e.preventDefault();
    window.location.href = "profile.html";
  }
});