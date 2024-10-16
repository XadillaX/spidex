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

/**
 * Retrieves the default user agent string.
 *
 * @return {string} The default user agent string.
 */
export function getDefaultUserAgent() {
  return statics.getDefaultUserAgent();
}

/**
 * Sets the default user agent string.
 *
 * @param {string} userAgent - The user agent string to set as default.
 */
export function setDefaultUserAgent(userAgent: string) {
  statics.setDefaultUserAgent(userAgent);
}

/**
 * Parses the cookies from the response headers.
 *
 * @deprecated Use {@link parseCookies} instead.
 */
export const parseCookie = parseCookies;

/**
 * Parses the cookies from the response headers.
 *
 * @param respHeaders - The response headers containing cookies.
 * @return The concatenated string of cookies.
 */
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
