/**
 * DomHelpers - DOM utility functions
 */
const DomHelpers = (() => {
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }
  function $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }
  function on(el, event, handler, options) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.addEventListener(event, handler, options);
    return () => el.removeEventListener(event, handler, options);
  }
  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function addClass(el, ...classes) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.classList.add(...classes);
  }
  function removeClass(el, ...classes) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.classList.remove(...classes);
  }
  function toggleClass(el, cls, force) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.classList.toggle(cls, force);
  }
  return { $, $$, on, setHTML, setText, addClass, removeClass, toggleClass };
})();
