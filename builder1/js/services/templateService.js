/**
 * TemplateService - Load/save card templates
 * TODO: Implement template loading from config
 */
const TemplateService = (() => {
  function getTemplates() {
    return [
      { id: 'wedding', label: 'Wedding', emoji: '💍' },
      { id: 'nikah', label: 'Nikah', emoji: '🌙' },
      { id: 'birthday', label: 'Birthday', emoji: '🎂' },
      { id: 'anniversary', label: 'Anniversary', emoji: '❤' },
      { id: 'corporate', label: 'Corporate', emoji: '💼' },
    ];
  }
  function applyTemplate(templateId) {
    AppState.update('card.templateId', templateId);
    EventBus.emit('card:updated', { field: 'templateId', value: templateId });
  }
  return { getTemplates, applyTemplate };
})();
