/* ════════════════════════════════════════════════════════════
   auth-popup-helper.js - Shared Authentication Modal Logic
   ════════════════════════════════════════════════════════════ */

// Make sure BACKEND_URL is defined on page
if (typeof BACKEND_URL === 'undefined' || !BACKEND_URL) {
  window.BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://myinvitationcard.onrender.com";
}

// ── Dynamic Login Popup Injection ──
function injectLoginPopup() {
  if (document.getElementById('login-popup')) return; // Avoid duplicate injection
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'login-overlay';
  overlay.id = 'login-overlay';
  overlay.onclick = (e) => hideLoginPopup(e);
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = 'login-popup';
  popup.id = 'login-popup';
  popup.onclick = (e) => e.stopPropagation();
  
  popup.innerHTML = `
    <button class="lp-close" onclick="hideLoginPopup(event)" title="Close dialog"><i class="fa-solid fa-xmark"></i></button>
    
    <!-- View 1: Welcome Options -->
    <div id="lp-view-welcome" class="lp-view active">
      <div class="lp-title">Login</div>
      <button class="lp-google-btn" onclick="handleGoogleLogin()">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
        Continue with Google
      </button>
      <button class="lp-signin-btn" onclick="switchPopupView('lp-view-signin')">
        <i class="fa-regular fa-envelope"></i>
        Login with Email
      </button>
      <div class="lp-create-link">
        Don't have an account? <span id="lp-signup-btn-show" onclick="switchPopupView('lp-view-signup')">Sign up</span>
      </div>
    </div>

    <!-- View 2: Sign In -->
    <div id="lp-view-signin" class="lp-view">
      <div class="lp-title">Login</div>
      <form class="lp-form" onsubmit="handleEmailLogin(event)">
        <input type="email" id="lp-login-email" class="lp-input" placeholder="Email Address" required>
        <input type="password" id="lp-login-password" class="lp-input" placeholder="Password" required>
        <button type="submit" class="lp-action-btn">Login</button>
      </form>
      <div class="lp-switch-link">
        <span onclick="switchPopupView('lp-view-welcome')">Back</span>
      </div>
    </div>

    <!-- View 3: Sign Up -->
    <div id="lp-view-signup" class="lp-view">
      <div class="lp-title">Sign Up</div>
      <form class="lp-form" onsubmit="handleEmailSignup(event)">
        <input type="text" id="lp-signup-name" class="lp-input" placeholder="Full Name" required>
        <input type="email" id="lp-signup-email" class="lp-input" placeholder="Email Address" required>
        <input type="password" id="lp-signup-password" class="lp-input" placeholder="Password" required>
        <input type="password" id="lp-signup-confirm" class="lp-input" placeholder="Confirm Password" required>
        <button type="submit" class="lp-action-btn">Create Account</button>
      </form>
      <div class="lp-switch-link">
        Already have an account? <span onclick="switchPopupView('lp-view-signin')">Login</span> | <span onclick="switchPopupView('lp-view-welcome')">Back</span>
      </div>
    </div>

    <!-- View 4: OTP Verification -->
    <div id="lp-view-otp" class="lp-view">
      <div class="lp-title">Verify Code</div>
      <p class="lp-otp-text">Enter the 6-digit verification code sent to your email.</p>
      <form class="lp-form" onsubmit="handleVerifyOtp(event)">
        <input type="text" id="lp-otp-code" class="lp-input" placeholder="Enter 6-digit code" maxlength="6" pattern="\\d{6}" required style="text-align:center; font-size:20px; letter-spacing:8px;">
        <button type="submit" class="lp-action-btn">Verify Code</button>
      </form>
      <div class="lp-resend-section">
        <span>Didn't receive code?</span>
        <button class="lp-resend-btn" onclick="handleResendOtp()" type="button">Resend OTP</button>
      </div>
      <div class="lp-switch-link">
        <span onclick="switchPopupView('lp-view-signup')">Back</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
}

// ── Control Handlers ──
window.showLoginPopup = function(e) {
  if (e) e.stopPropagation();
  document.getElementById('login-overlay').classList.add('show');
  document.getElementById('login-popup').classList.add('show');
  switchPopupView('lp-view-welcome');
};

window.hideLoginPopup = function(e) {
  if (e) e.stopPropagation();
  document.getElementById('login-overlay').classList.remove('show');
  document.getElementById('login-popup').classList.remove('show');
};

window.switchPopupView = function(viewId) {
  document.querySelectorAll('.lp-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');
};

// ── Real Firebase Auth Handlers ──
window.handleGoogleLogin = async function() {
  if (typeof firebaseAuth === 'undefined' || !firebaseAuth || !firebaseConfig) {
    toast("Auth system is loading. Please try again.", "e");
    return;
  }
  try {
    const result = await firebaseAuth.signInWithPopup(firebaseConfig.auth, firebaseConfig.googleProvider);
    toast(`Welcome back, ${result.user.displayName || 'User'}!`, 's');
    hideLoginPopup();
  } catch (error) {
    console.error("Google sign in failed:", error);
    toast("Google login failed. Please try again.", "e");
  }
};

window.handleEmailLogin = async function(e) {
  if (e) e.preventDefault();
  if (typeof firebaseAuth === 'undefined' || !firebaseAuth || !firebaseConfig) {
    toast("Auth system is loading. Please try again.", "e");
    return;
  }
  const email = document.getElementById('lp-login-email').value.trim();
  const password = document.getElementById('lp-login-password').value;
  
  if (!email || !password) {
    toast("Please enter your email and password.", "e");
    return;
  }
  
  try {
    const result = await firebaseAuth.signInWithEmailAndPassword(firebaseConfig.auth, email, password);
    toast(`Welcome back, ${result.user.displayName || result.user.email.split('@')[0]}!`, 's');
    hideLoginPopup();
  } catch (error) {
    console.error("Email sign in failed:", error);
    toast("Incorrect email or password.", "e");
  }
};

let pendingSignupName = "";
let pendingSignupEmail = "";
let pendingSignupPassword = "";

window.handleEmailSignup = async function(e) {
  if (e) e.preventDefault();
  
  const fullName = document.getElementById('lp-signup-name').value.trim();
  const email = document.getElementById('lp-signup-email').value.trim();
  const password = document.getElementById('lp-signup-password').value;
  const confirm = document.getElementById('lp-signup-confirm').value;
  
  if (!fullName || !email || !password || !confirm) {
    toast("Please fill all fields.", "e");
    return;
  }
  
  if (password !== confirm) {
    toast("Passwords do not match.", "e");
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/send-otp`, {
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
      toast(data.message || "Unable to send verification code.", "e");
      return;
    }
    
    pendingSignupName = fullName;
    pendingSignupEmail = email;
    pendingSignupPassword = password;
    
    toast("Verification code sent to your email.", "s");
    switchPopupView('lp-view-otp');
  } catch (err) {
    console.error("Signup failed:", err);
    toast("Failed to register. Please try again.", "e");
  }
};

window.handleVerifyOtp = async function(e) {
  if (e) e.preventDefault();
  if (typeof firebaseAuth === 'undefined' || !firebaseAuth || !firebaseConfig) {
    toast("Auth system is loading. Please try again.", "e");
    return;
  }
  
  const otpInput = document.getElementById('lp-otp-code');
  const otp = otpInput ? otpInput.value.trim() : "";
  
  if (!otp) {
    toast("Enter verification code.", "e");
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/verify-otp`, {
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
      toast(data.message || "OTP verification failed.", "e");
      return;
    }
    
    // Register user with Firebase using dynamic email/password
    try {
      const result = await firebaseAuth.createUserWithEmailAndPassword(firebaseConfig.auth, pendingSignupEmail, pendingSignupPassword);
      
      // Update display name
      if (result.user) {
        await firebaseAuth.updateProfile(result.user, {
          displayName: pendingSignupName
        });
      }
      
      // Persist display name locally immediately
      localStorage.setItem("signupFullName", pendingSignupName);
      
      // Call backend to sync user details to database
      try {
        await fetch(`${BACKEND_URL}/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            uid: result.user.uid,
            email: result.user.email,
            fullName: pendingSignupName
          })
        });
      } catch (dbErr) {
        console.error("Failed to sync user to MongoDB:", dbErr);
      }
      
      toast(`Account created successfully! Welcome, ${pendingSignupName}!`, 's');
      hideLoginPopup();
    } catch (firebaseErr) {
      console.error("Firebase signup failed after OTP:", firebaseErr);
      toast(firebaseErr.message || "Sign up failed. Please try again.", "e");
    }
  } catch (err) {
    console.error("OTP verification request failed:", err);
    toast("Failed to verify code. Please try again.", "e");
  }
};

window.handleResendOtp = async function() {
  if (!pendingSignupEmail || !pendingSignupName || !pendingSignupPassword) {
    toast("Signup details missing. Please restart signup.", "e");
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fullName: pendingSignupName,
        email: pendingSignupEmail,
        password: pendingSignupPassword
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      toast(data.message || "Unable to resend verification code.", "e");
      return;
    }
    toast("Verification code resent to your email.", "s");
  } catch (err) {
    console.error("Resend OTP failed:", err);
    toast("Failed to resend code. Please try again.", "e");
  }
};

// Inject the popup elements automatically once DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLoginPopup);
} else {
  injectLoginPopup();
}
