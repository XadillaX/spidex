import * as pkg from '../package.json';

let userAgent = `Spidex v${pkg.version} (Node.js Client / Like a Spider / Powered by XadillaX)`;

export function getDefaultUserAgent() {
  return userAgent;
}

export function setDefaultUserAgent(ua: string) {
  userAgent = ua;
}
