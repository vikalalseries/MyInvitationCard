/**
 * Logger - Debug logging with level control
 */
const Logger = (() => {
  const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
  let currentLevel = LEVELS.info;
  const prefix = '[MIC Builder]';

  function debug(...args) { if (currentLevel <= LEVELS.debug) console.debug(prefix, ...args); }
  function info(...args) { if (currentLevel <= LEVELS.info) console.log(prefix, ...args); }
  function warn(...args) { if (currentLevel <= LEVELS.warn) console.warn(prefix, ...args); }
  function error(...args) { if (currentLevel <= LEVELS.error) console.error(prefix, ...args); }
  function setLevel(level) { currentLevel = LEVELS[level] ?? LEVELS.info; }

  return { debug, info, warn, error, setLevel };
})();
