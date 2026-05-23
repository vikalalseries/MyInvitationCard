window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 80) { navbar.classList.add('scrolled'); }
  else { navbar.classList.remove('scrolled'); }
});

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const mobileNavUserPopup = document.getElementById('mobileNavUserPopup');
const heroGetStartedBtn = document.getElementById('heroGetStartedBtn');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mobileNavUserPopup) {
      mobileNavUserPopup.classList.remove('show');
    }
    mobileMenu.classList.toggle('open');
  });

  mobileMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (
      !mobileMenu.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      mobileMenu.classList.remove('open');
    }
  });
}

if (heroGetStartedBtn) {
  heroGetStartedBtn.addEventListener('click', () => {
    window.location.href = 'template-dashboard.html';
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.getAttribute('data-filter');
    document.querySelectorAll('.template-card').forEach(card => {
      if (filter === 'all' || card.getAttribute('data-category') === filter) { card.classList.remove('hidden'); }
      else { card.classList.add('hidden'); }
    });
  });
});

function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-icon');
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-icon').forEach(i => i.textContent = '+');
  if (!isOpen) { answer.classList.add('open'); icon.textContent = '−'; }
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => { entry.target.classList.add('visible'); }, 80 * (i % 4));
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.step-card, .template-card, .feature-item, .testimonial-card, .faq-item')
  .forEach(el => { el.classList.add('reveal'); observer.observe(el); });


// ── TEMPLATE FILTER TABS ──
const tabBtns = document.querySelectorAll('.tab-btn');
const templateCards = document.querySelectorAll('.template-card');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {

    // Set active tab
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    // Show/hide cards
    templateCards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
});


async function loadHomeTemplates() {
  const grid = document.getElementById("homeTemplateGrid");
  if (!grid) return;

  try {
    const res = await fetch("data/templates.json");
    const templates = await res.json();

    function pickRandom(arr) {
      if (!arr.length) return null;
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const hinduWedding = templates.filter(
      t =>
        t.event === "wedding" &&
        t.religion === "hindu"
    );

    const muslimWedding = templates.filter(
      t =>
        t.event === "wedding" &&
        (
          t.religion === "muslim" ||
          t.event === "nikah"
        )
    );

    const christianWedding = templates.filter(
      t =>
        t.event === "wedding" &&
        t.religion === "christian"
    );

    const birthdayTemplates = templates.filter(
      t => t.event === "birthday"
    );

    const anniversaryTemplates = templates.filter(
      t => t.event === "anniversary"
    );

    const selected = [
      pickRandom(hinduWedding),
      pickRandom(muslimWedding),
      pickRandom(christianWedding),
      pickRandom(birthdayTemplates),
      pickRandom(anniversaryTemplates)
    ].filter(Boolean);

    const usedIds = selected.map(t => t.id);

    const wildcardPool = templates.filter(
      t => !usedIds.includes(t.id)
    );

    /* fill until total = 6 */
    while (selected.length < 6 && wildcardPool.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * wildcardPool.length
      );

      const picked = wildcardPool.splice(randomIndex, 1)[0];

      selected.push(picked);
    }

    grid.innerHTML = selected
      .map(
        (template, index) => `
          <a
            href="template-dashboard.html?template=${template.slug}"
            class="home-template-card reveal"
            style="animation-delay:${index * 120}ms"
          >
            <img
              src="${template.thumbnail}"
              alt="${template.title}"
              class="home-template-thumb"
              onerror="this.src='assets/templates/default-template.jpg'"
            />

            <div class="home-template-info">
              <div class="home-template-title">
                ${template.title}
              </div>
            </div>
          </a>
        `
      )
      .join("");

  } catch (err) {
    console.error("Homepage templates failed:", err);
  }
}

loadHomeTemplates();

function revealOnScroll() {
  const reveals = document.querySelectorAll(".reveal");

  reveals.forEach((item) => {
    const top = item.getBoundingClientRect().top;
    const trigger = window.innerHeight - 80;

    if (top < trigger) {
      item.classList.add("visible");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);



const howItWorksBtn = document.getElementById("howItWorksNavBtn");
const offset = 130;

if (howItWorksBtn) {
  howItWorksBtn.addEventListener("click", (e) => {
    e.preventDefault();

    document.getElementById("how-it-works").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}



const mobileHowItWorksBtn = document.getElementById("mobileHowItWorksNavBtn");

if (mobileHowItWorksBtn) {
  mobileHowItWorksBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const section = document.getElementById("how-it-works");
    const offset = 130;

    window.scrollTo({
      top: section.offsetTop - offset,
      behavior: "smooth"
    });

    document.getElementById("mobileMenu")?.classList.remove("show");
  });
}