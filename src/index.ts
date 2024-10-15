import * as statics from './statics';

export {
  get,
  post,
  put,
  delete,
  method,
  hessianV2,
  _combineHeader,
} from './SpidexInstance';

export {
  SpidexBasicHTTPMethod,
  SpidexRequestCallback,
  SpidexRequestCallbackContentType,
  SpidexRequestOptions,
  SpidexRequestOptionsWithoutCharset,
  SpidexURLDecodedObject,
} from './spidex';

export { SpidexSupportedCharset } from './SpidexSupportedCharset';

export function getDefaultUserAgent() {
  return statics.getDefaultUserAgent();
}

export function setDefaultUserAgent(userAgent: string) {
  statics.setDefaultUserAgent(userAgent);
}

export const parseCookie = parseCookies;
export function parseCookies(respHeaders: import('http').IncomingHttpHeaders) {
  const cookies = respHeaders['set-cookie'] || [];
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return '';
  }

  let cookie = '';
  for (const c of cookies) {
    let tmpCookie = c;
    if (tmpCookie.indexOf(';') !== -1) {
      tmpCookie = tmpCookie.substr(0, tmpCookie.indexOf(';') + 1);
    }
    cookie += tmpCookie;
    cookie += ' ';
  }

  return cookie;
}
