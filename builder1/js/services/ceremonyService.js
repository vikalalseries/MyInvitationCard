/**
 * CeremonyService - Indian ceremony/event data and logic
 * TODO: Load from data/ceremonies.json
 */
const CeremonyService = (() => {
  const DEFAULT_CEREMONIES = [
    { id: 'vivah', name: 'Vivah Samaroh', nameHi: 'विवाह समारोह' },
    { id: 'sagai', name: 'Sagai / Engagement', nameHi: 'सगाई' },
    { id: 'haldi', name: 'Haldi Ceremony', nameHi: 'हल्दी' },
    { id: 'mehendi', name: 'Mehendi Night', nameHi: 'मेहंदी' },
    { id: 'sangeet', name: 'Sangeet Night', nameHi: 'संगीत' },
    { id: 'baraat', name: 'Baraat', nameHi: 'बारात' },
    { id: 'reception', name: 'Reception', nameHi: 'रिसेप्शन' },
  ];
  function getAll() { return DEFAULT_CEREMONIES; }
  function getById(id) { return DEFAULT_CEREMONIES.find(c => c.id === id); }
  return { getAll, getById };
})();
