'use strict';

const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const encodings = require('iconv-lite/encodings');

const filename = path.join(__dirname, '../src/SpidexSupportedCharset.ts');
let content = `export type SpidexSupportedCharset = ${Object.keys(encodings).map(key => `'${key}'`).join(' | ')};`;
content = `// This file is generated by tools/generate_supported_charsets.js

/**
 * The supported charset types.
 */
${content}`;

fs.writeFileSync(filename, content);
cp.execSync(`${path.join(__dirname, '../node_modules/.bin/prettier')} --write ${filename}`);
cp.execSync(`${path.join(__dirname, '../node_modules/.bin/eslint')} --fix ${filename}`);

console.log('SpidexSupportedCharset.ts has been updated.');
