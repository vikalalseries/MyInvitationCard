// Admin login and password reset handler
const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:5000"
  : "https://myinvitationcard.onrender.com";

// Toast Notification helper
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast-admin ${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// State variables
let currentUsername = "";

// DOM Elements
const credentialsForm = document.getElementById("credentialsForm");
const otpVerificationForm = document.getElementById("otpVerificationForm");
const passwordResetWrapper = document.getElementById("passwordResetWrapper");

const adminUsernameInput = document.getElementById("adminUsername");
const adminPasswordInput = document.getElementById("adminPassword");
const adminOtpInput = document.getElementById("adminOtp");

const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const closeResetBtn = document.getElementById("closeResetBtn");
const backToCredentialsBtn = document.getElementById("backToCredentialsBtn");

const devOtpText = document.getElementById("devOtpText");

// Reset Form elements
const resetSubtext = document.getElementById("resetSubtext");
const resetRequestForm = document.getElementById("resetRequestForm");
const resetVerifyForm = document.getElementById("resetVerifyForm");
const resetCompleteForm = document.getElementById("resetCompleteForm");

const resetUsernameInput = document.getElementById("resetUsername");
const resetEmailOtpInput = document.getElementById("resetEmailOtp");
const resetPhoneOtpInput = document.getElementById("resetPhoneOtp");
const newPasswordInput = document.getElementById("newPassword");
const confirmNewPasswordInput = document.getElementById("confirmNewPassword");

const devEmailOtpText = document.getElementById("devEmailOtpText");
const devPhoneOtpText = document.getElementById("devPhoneOtpText");

// 1. Submit Credentials
credentialsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = adminUsernameInput.value.trim();
  const password = adminPasswordInput.value;

  const submitBtn = document.getElementById("loginSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to log in");
    }

    currentUsername = username;
    credentialsForm.classList.add("hidden");
    otpVerificationForm.classList.remove("hidden");

    showToast("OTP sent to your email!", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Continue</span> <i class="fa-solid fa-arrow-right"></i>';
  }
});

// 2. Submit OTP Code
otpVerificationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const otp = adminOtpInput.value.trim();

  const verifyBtn = document.getElementById("verifyOtpBtn");
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, otp })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Invalid OTP code");
    }

    // Save admin details and token
    localStorage.setItem("mic_admin_session", JSON.stringify(data.admin));
    localStorage.setItem("mic_admin_token", data.token);
    showToast("Login verified! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<span>Verify & Login</span> <i class="fa-solid fa-circle-check"></i>';
  }
});

// Navigation / Form Toggles
backToCredentialsBtn.addEventListener("click", () => {
  otpVerificationForm.classList.add("hidden");
  credentialsForm.classList.remove("hidden");
  if (devOtpText) devOtpText.style.display = "none";
});

forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  credentialsForm.classList.add("hidden");
  passwordResetWrapper.classList.remove("hidden");
  
  // Reset states
  resetRequestForm.classList.remove("hidden");
  resetVerifyForm.classList.add("hidden");
  resetCompleteForm.classList.add("hidden");
  resetSubtext.textContent = "Enter your username to request security OTPs";
});

closeResetBtn.addEventListener("click", () => {
  passwordResetWrapper.classList.add("hidden");
  credentialsForm.classList.remove("hidden");
  devEmailOtpText.style.display = "none";
  devPhoneOtpText.style.display = "none";
});

// PASSWORD RESET FLOW
// Step 1: Submit Username
resetRequestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = resetUsernameInput.value.trim();

  const reqBtn = document.getElementById("sendResetOtpsBtn");
  reqBtn.disabled = true;
  reqBtn.textContent = "Requesting...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/reset-password/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Error processing request");
    }

    currentUsername = username;
    resetRequestForm.classList.add("hidden");
    resetVerifyForm.classList.remove("hidden");
    resetSubtext.textContent = "Verify the secure codes sent to your email & mobile";

    if (data.devEmailOtp && data.devPhoneOtp) {
      devEmailOtpText.style.display = "block";
      devEmailOtpText.textContent = `Dev Email OTP: ${data.devEmailOtp}`;
      devPhoneOtpText.style.display = "block";
      devPhoneOtpText.textContent = `Dev Phone OTP: ${data.devPhoneOtp}`;
    }

    showToast("Verification codes dispatched!", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    reqBtn.disabled = false;
    reqBtn.textContent = "Send Verification Codes";
  }
});

// Step 2: Verify 2FA OTP Codes
resetVerifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const emailOtp = resetEmailOtpInput.value.trim();
  const phoneOtp = resetPhoneOtpInput.value.trim();

  const verifyBtn = document.getElementById("verifyResetOtpsBtn");
  verifyBtn.disabled = true;
  verifyBtn.textContent = "Verifying...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/reset-password/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, emailOtp, phoneOtp })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "OTP verification failed");
    }

    resetVerifyForm.classList.add("hidden");
    resetCompleteForm.classList.remove("hidden");
    resetSubtext.textContent = "Create a secure new password for your account";

    devEmailOtpText.style.display = "none";
    devPhoneOtpText.style.display = "none";
    showToast("Identity verified! Set your new password.", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.textContent = "Verify Codes";
  }
});

// Step 3: Complete password Reset
resetCompleteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  if (newPassword !== confirmNewPassword) {
    showToast("Passwords do not match!", "error");
    return;
  }

  const completeBtn = document.getElementById("completeResetBtn");
  completeBtn.disabled = true;
  completeBtn.textContent = "Resetting...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/reset-password/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, newPassword })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to reset password");
    }

    showToast("Password reset successful! Go to Login.", "success");

    setTimeout(() => {
      passwordResetWrapper.classList.add("hidden");
      credentialsForm.classList.remove("hidden");
      adminUsernameInput.value = currentUsername;
      adminPasswordInput.value = "";
      adminPasswordInput.focus();
    }, 1500);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    completeBtn.disabled = false;
    completeBtn.textContent = "Reset Password";
  }
});

// Toggle password visibility
document.querySelectorAll(".toggle-password").forEach(toggle => {
  toggle.addEventListener("click", () => {
    const targetId = toggle.getAttribute("data-target");
    const passwordInput = document.getElementById(targetId);
    if (!passwordInput) return;

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggle.classList.remove("fa-eye-slash");
      toggle.classList.add("fa-eye");
    } else {
      passwordInput.type = "password";
      toggle.classList.remove("fa-eye");
      toggle.classList.add("fa-eye-slash");
    }
  });
});
