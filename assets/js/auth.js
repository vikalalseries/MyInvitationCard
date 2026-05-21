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
  toastMessage.textContent = message;
  toastMessage.className = `custom-toast show ${type}`;

  setTimeout(() => {
    toastMessage.className = "custom-toast";
  }, 3500);
}


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
const openSignupDirectBtn = document.getElementById("openSignupDirectBtn");

let pendingSignupEmail = "";
let pendingSignupPassword = "";
let resendCountdown;

function showModal() {
  authOverlay.classList.add("show");
  authModal.classList.add("show");
}

function hideModal() {
  authOverlay.classList.remove("show");
  authModal.classList.remove("show");
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
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

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
    sidebarAuthGuest.classList.add("hidden");
    sidebarAuthUser.classList.remove("hidden");

    userName.textContent = user.displayName || "User";
    userEmail.textContent = user.email || "";

    if (user.photoURL) {
      userAvatar.innerHTML = `<img src="${user.photoURL}" alt="User">`;
    } else {
      const letter = (user.displayName || "U")[0].toUpperCase();
      userAvatar.textContent = letter;
    }

  } else {
    sidebarAuthGuest.classList.remove("hidden");
    sidebarAuthUser.classList.add("hidden");
  }
});