window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 20) { navbar.classList.add('scrolled'); }
  else { navbar.classList.remove('scrolled'); }
});

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
if (hamburger) { hamburger.addEventListener('click', () => { mobileMenu.classList.toggle('open'); }); }

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