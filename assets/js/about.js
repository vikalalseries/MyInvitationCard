// FAQ TOGGLE
document.querySelectorAll(".faq-question-about").forEach((button) => {
  button.addEventListener("click", () => {
    const faqItem = button.parentElement;
    const icon = button.querySelector("span");

    faqItem.classList.toggle("active");

    if (faqItem.classList.contains("active")) {
      icon.textContent = "−";
    } else {
      icon.textContent = "+";
    }
  });
});

// MOBILE MENU TOGGLE
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    mobileMenu.classList.toggle("active");
  });
}

// CLOSE MOBILE MENU WHEN LINK CLICKED
document.querySelectorAll("#mobileMenu a, #mobileMenu button").forEach((item) => {
  item.addEventListener("click", () => {
    hamburger?.classList.remove("active");
    mobileMenu?.classList.remove("active");
  });
});

// CLOSE USER POPUP WHEN CLICK OUTSIDE
const navUserMenuBtn = document.getElementById("navUserMenuBtn");
const navUserPopup = document.getElementById("navUserPopup");

if (navUserMenuBtn && navUserPopup) {
  navUserMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    navUserPopup.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    navUserPopup.classList.remove("show");
  });

  navUserPopup.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// LOGO CLICK SCROLL FIX
const logoBtn = document.getElementById("logoScrollBtn");

if (logoBtn) {
  logoBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}