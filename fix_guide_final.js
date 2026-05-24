const fs = require('fs');

void fs;

console.warn(
  'fix_guide_final.js has been disabled. ' +
  'It previously rewrote index.html using fragile string replacements ' +
  'that no longer match the current file and could corrupt repository contents.'
);
process.exitCode = 1;
