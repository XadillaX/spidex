import * as _ from 'lodash';
import { EventEmitter } from 'eventemitter3';
import * as iconv from 'iconv-lite';
import * as urlencode from 'urlencode';

import { SpidexSupportedCharset } from './SpidexSupportedCharset';
import * as statics from './statics';

/**
 * Determine if the current environment is Node.js.
 *
 * This check is crucial for deciding which modules to load and how to handle certain operations. In a Node.js
 * environment, we have access to the 'process' object and can check its release name. If this check fails (e.g., in a
 * browser environment), we assume it's not Node.js.
 *
 * This distinction allows Spidex to adapt its behavior based on the runtime environment, ensuring compatibility across
 * different JavaScript platforms.
 */
let isNode = false;
try {
  isNode = (process.release.name === 'node');
} catch (e) {
  isNode = false;
}

interface HessianTempDeclare {
  encode<T>(obj: T, version?: '1.0' | '2.0'): Buffer;
  decode<T>(buffer: Buffer, version?: '1.0' | '2.0'): T;
}

const mod: {
  http: typeof import('http') | Promise<typeof import('http')> | undefined;
  https: typeof import('https') | Promise<typeof import('https')> | undefined;
  'hessian.js': HessianTempDeclare | Promise<HessianTempDeclare> | null | undefined;
} = {
  http: undefined,
  https: undefined,
  'hessian.js': undefined,
};

/**
 * Load a module.
 * @param type The type of module to load.
 * @return The loaded module.
 */
async function load<K extends keyof typeof mod>(type: K): Promise<typeof mod[K]> {
  // Check if the module has already been loaded to avoid redundant imports.
  if (mod[type] !== undefined) {
    return mod[type];
  }

  // Load the module based on the current environment (Node.js or browser).
  if (isNode) {
    // In Node.js, use dynamic import to load native modules.
    mod[type] = import(type);
  } else {
    // In browser environments, import specific browser-compatible alternatives.
    switch (type) {
      case 'http':
        mod[type] = import('stream-http');
        break;
      case 'https':
        mod[type] = import('https-browserify');
        break;
      case 'hessian.js':
        // Hessian.js is not supported in browser environments.
        mod['hessian.js'] = null;
        break;
      default:
        // Throw an error if an unknown module type is requested.
        throw new Error(`Unknown type: ${type}`);
    }
  }

  // If the loaded module is a promise, wait for it to resolve. This ensures the module is fully initialized before
  // returning.
  if (mod[type] && typeof (mod[type] as any).then === 'function') {
    mod[type] = await mod[type];
  }

  // Return the loaded module, which may be undefined if loading failed.
  return mod[type];
}

function _noCallback() {}

/**
 * The basic HTTP method.
 */
export type SpidexBasicHTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * The URL decoded object.
 */
export type SpidexURLDecodedObject = Record<string, string>;

/**
 * The request options without charset.
 */
export interface SpidexRequestOptionsWithoutCharset {
  /**
   * The request body data.
   */
  data?: Buffer | string | SpidexURLDecodedObject;

  /**
   * The request header.
   */
  header?: import('http').OutgoingHttpHeaders;

  /**
   * The total timeout value.
   */
  timeout?: number;

  /**
   * The response timeout value.
   */
  responseTimeout?: number;

  /**
   * The request timeout value.
   */
  requestTimeout?: number;
}

/**
 * The request options.
 */
export interface SpidexRequestOptions<C extends SpidexSupportedCharset> extends SpidexRequestOptionsWithoutCharset {
  /**
   * The charset of the request body.
   */
  charset?: C;
}

/**
 * The request callback content type.
 */
export type SpidexRequestCallbackContentType<C extends SpidexSupportedCharset> = C extends 'binary' ? Buffer : string;

/**
 * The request callback.
 */
export type SpidexRequestCallback<C extends SpidexSupportedCharset> =
  (
    content: SpidexRequestCallbackContentType<C>,
    status: number,
    responseHeaders: import('http').IncomingHttpHeaders,
  ) => any;

type CombinedHeader<T extends (import('http').OutgoingHttpHeaders | string)> =
  (
    T extends import('http').OutgoingHttpHeaders ? {
      [key in keyof T as Lowercase<string & key>]: string | number | undefined;
    } : {}
  ) & {
    'user-agent': string;
  };

interface InternalContext {
  calledBack: boolean;
  error: boolean;
  bodyEncode: null | 'binary';
  charset: SpidexSupportedCharset;
  data?: Buffer | string;
}

/**
 * Spidex - a web requester for Node.js and browsers.
 * @class Spidex
 */
export class Spidex extends EventEmitter {
  /**
   * Combine the header with the default user agent.
   * @param headers The header to be combined.
   * @return The combined header.
   */
  _combineHeader<T extends(import('http').OutgoingHttpHeaders | string)>(headers: T) {
    const newHeaders: CombinedHeader<T> = {
      'user-agent': statics.getDefaultUserAgent(),
    } as CombinedHeader<T>;

    if (typeof headers === 'string') {
      return newHeaders;
    }

    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        newHeaders[key.toLowerCase()] = headers[key];
      }
    }

    return newHeaders;
  }

  /**
   * The request method with basic HTTP method.
   * @param method The basic HTTP method.
   * @param url The URL.
   * @param [options] The request options.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: SpidexBasicHTTPMethod,
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with basic HTTP method and without options.
   * @param method The HTTP method.
   * @param url The URL.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  method(
    method: SpidexBasicHTTPMethod,
    url: string,
    callback?: SpidexRequestCallback<'utf8'>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with other HTTP method.
   * @param method The HTTP method.
   * @param url The URL.
   * @param [options] The request options.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: string,
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with other HTTP method and without options.
   * @param method The HTTP method.
   * @param url The URL.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: string,
    url: string,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: string,
    url: string,
    options?: SpidexRequestOptions<C> | SpidexRequestCallback<C>,
    callback?: SpidexRequestCallback<C>,
  ) {
    const ctx = {
      calledBack: false,
      error: false,
      bodyEncode: null,
      charset: 'utf8',
    } as InternalContext;

    /**
     * Handle the case where options are omitted and the callback is passed as the third argument.
     *
     * This allows for a more flexible function signature, supporting both:
     *
     *   - method(method, url, options, callback)
     *   - method(method, url, callback)
     *
     * By doing this check, we ensure that the function can be called with or without options, improving its usability.
     */
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (undefined === callback) {
      callback = _noCallback;
    }

    const emitter = new EventEmitter<{
      error: [Error];
    }>();

    options = options || {};
    let urlObject: URL;
    try {
      urlObject = new URL(url);
    } catch (e) {
      /**
       * Handle invalid URLs by emitting an error event on the next tick of the event loop.
       *
       * This asynchronous error handling ensures that the error is not thrown synchronously, which could disrupt the
       * execution flow. Instead, it allows the caller to handle the error through the event emitter, promoting a more
       * consistent error handling approach across the library.
       */
      process.nextTick(() => {
        emitter.emit('error', e);
      });
      return emitter;
    }

    const protocol = urlObject.protocol;
    const charset = options.charset || 'utf8';
    ctx.charset = charset;

    /**
     * Process the request data based on its type and the specified charset.
     *
     *   - If data is a Buffer, it's treated as binary data.
     *   - If data is an object, it's stringified and URL-encoded using the specified charset.
     *   - Otherwise, data is assumed to be a string and used as-is.
     *
     * This preprocessing ensures that the request body is properly formatted regardless of the input type, providing
     * flexibility in how users can specify request data.
     */
    let data = options.data || '';
    if (data instanceof Buffer) {
      ctx.bodyEncode = 'binary';
    } else if (typeof data === 'object') {
      data = urlencode.stringify(data, { charset });
    }
    ctx.data = data;

    const header = this._combineHeader(options.header || {});
    if (!header['content-length']) {
      header['content-length'] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
    }

    if (!header['content-type'] && method.toLowerCase() !== 'get') {
      header['content-type'] = 'application/x-www-form-urlencoded';
    }

    /**
     * Determine the appropriate module to use based on the URL protocol.
     *
     * This allows Spidex to support both HTTP and HTTPS requests seamlessly.
     *
     * The dynamic loading of modules (http or https) is handled by the `load` function, which takes care of
     * environment-specific module loading (Node.js vs browser).
     */
    const p = (protocol === 'http:' ? load('http') : (protocol === 'https:' ? load('https') : null));
    if (!p) {
      process.nextTick(() => {
        emitter.emit('error', new Error(`Unsupported protocol: ${protocol}`));
      });
      return emitter;
    }

    const realOptions = {
      host: urlObject.hostname,
      port: urlObject.port,
      path: urlObject.pathname + urlObject.search,
      headers: header as import('http').OutgoingHttpHeaders,
      method,
      rejectUnauthorized: false,
    };

    /**
     * Initiate the actual HTTP request using the doRequest method.
     *
     * This method encapsulates the complex logic of making the request, handling timeouts, and processing the response.
     * It returns a promise, allowing for easier error handling and asynchronous flow control.
     */
    this.doRequest(ctx, p as any, method, realOptions, options, emitter, callback).catch(err => {
      if (ctx.calledBack || ctx.error) {
        return;
      }
      emitter.emit('error', err);
    });

    return emitter;
  }

  /**
   * The request method with DELETE HTTP method.
   * @param url The URL.
   * @param [options] The request options.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  delete<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with DELETE HTTP method and without options.
   * @param url The URL.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  delete<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  delete<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C> | SpidexRequestCallback<C>,
    callback?: SpidexRequestCallback<C>,
  ) {
    return this.method('DELETE', url, options as any, callback as any);
  }

  /**
   * The request method with GET HTTP method.
   * @param url The URL.
   * @param [options] The request options.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  get<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with GET HTTP method and without options.
   * @param url The URL.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  get<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  get<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C> | SpidexRequestCallback<C>,
    callback?: SpidexRequestCallback<C>,
  ) {
    return this.method('GET', url, options as any, callback as any);
  }

  /**
   * The request method with POST HTTP method.
   * @param url The URL.
   * @param [options] The request options.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  post<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with POST HTTP method and without options.
   * @param url The URL.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  post<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  post<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C> | SpidexRequestCallback<C>,
    callback?: SpidexRequestCallback<C>,
  ) {
    return this.method('POST', url, options as any, callback as any);
  }

  /**
   * The request method with PUT HTTP method.
   * @param url The URL.
   * @param [options] The request options.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  put<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  /**
   * The request method with PUT HTTP method and without options.
   * @param url The URL.
   * @param [callback] The request callback.
   * @return The response event emitter.
   */
  put<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;

  put<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C> | SpidexRequestCallback<C>,
    callback?: SpidexRequestCallback<C>,
  ) {
    return this.method('PUT', url, options as any, callback as any);
  }

  private async doRequest<C extends SpidexSupportedCharset = 'utf8'>(
    ctx: InternalContext,
    requester: Promise<typeof import('http')> | Promise<typeof import('https')>,
    method: string,
    options: import('http').RequestOptions & import('https').RequestOptions,
    rawOptions: SpidexRequestOptions<C>,
    emitter: EventEmitter<{
      error: [Error];
    }>,
    callback: SpidexRequestCallback<C>,
  ) {
    let allFinished = false;
    let timedOut = false;
    let requestTimedOut = false;
    let responseTimedOut = false;
    let timedOutEmitted = false;
    let timedOutHandler: any;
    let responseTimedOutHandler: any;

    /**
     * Determine the appropriate HTTP method to use.
     *
     *   - For GET requests, we use the 'get' method of the HTTP module, which doesn't require explicitly setting the
     *     method.
     *   - For all other request types, we use the general 'request' method and specify the HTTP method in the options.
     */
    let call: 'request' | 'get' = 'request';
    if (method.toLowerCase() === 'get') {
      call = 'get';
      delete options.method;
    }

    /**
     * Load the appropriate HTTP module (http or https) based on the URL protocol.
     *
     * This asynchronous loading allows Spidex to support both HTTP and HTTPS protocols while maintaining compatibility
     * with different JavaScript environments (Node.js and browsers).
     */
    const mod = await requester;
    let response: import('http').IncomingMessage;
    let request: import('http').ClientRequest = mod[call](options, resp => {
      response = resp;

      /**
       * Set up a response timeout if specified in the options.
       *
       * This timeout ensures that the response is received within the specified time limit. If the timeout is reached,
       * the request is aborted, and an error is emitted.
       */
      if (rawOptions.responseTimeout) {
        responseTimedOutHandler = setTimeout(() => {
          if (allFinished) return;
          if (timedOutEmitted) return;
          if (ctx.calledBack || ctx.error) return;

          timedOutEmitted = true;
          responseTimedOut = true;
          ctx.error = true;

          callback = _noCallback;

          if (timedOutHandler) {
            clearTimeout(timedOutHandler);
            timedOutHandler = undefined;
          }

          request.destroy();
          request = undefined as any;
          response.socket.destroy();
          response = undefined as any;

          emitter.emit('error', new Error(`Spidex response timeout in ${rawOptions.responseTimeout}ms.`));
        }, rawOptions.responseTimeout);
      }

      let content: string | Buffer = '';
      const status = response.statusCode;
      const headers = response.headers;
      response.setEncoding(ctx.charset === 'utf8' ? 'utf8' : 'binary');
      response.on('data', chunk => {
        content += chunk;
      });

      /**
       * Handle the completion of the response.
       *
       * This event listener processes the received data, clears any active timeouts, and invokes the callback with the
       * response content, status, and headers.
       */
      response.on('end', () => {
        allFinished = true;
        if (responseTimedOutHandler) {
          clearTimeout(responseTimedOutHandler);
          responseTimedOutHandler = undefined;
        }

        if (timedOutHandler) {
          clearTimeout(timedOutHandler);
          timedOutHandler = undefined;
        }

        request = undefined as any;
        response = undefined as any;

        /**
         * Process the response content based on the specified charset.
         *
         *   - For binary responses, convert the content to a Buffer.
         *   - For non-UTF-8 charsets, decode the content using iconv-lite.
         *   - For UTF-8, the content is already in the correct format.
         */
        if (ctx.charset === 'binary') {
          content = Buffer.from(content as string, 'binary');
        } else if (ctx.charset !== 'utf8') {
          content = iconv.decode(Buffer.from(content as string, 'binary'), ctx.charset);
        }

        if (!ctx.calledBack) {
          ctx.calledBack = true;
          callback(content as SpidexRequestCallbackContentType<C>, status as number, headers);
        }
      });
    });

    /**
     * Handle request errors.
     *
     * This error handler catches any errors that occur during the request process and emits them through the
     * EventEmitter, allowing the caller to handle these errors appropriately.
     */
    request.on('error', err => {
      if (timedOut || requestTimedOut || responseTimedOut || ctx.error || ctx.calledBack) return;
      ctx.error = true;
      emitter.emit('error', err);
    });

    /**
     * Set up a total timeout for the entire request-response cycle if specified in the options.
     *
     * This timeout ensures that the entire operation completes within the specified time limit. If the timeout is
     * reached, the request is aborted, and an error is emitted.
     */
    if (rawOptions.timeout) {
      timedOutHandler = setTimeout(() => {
        if (allFinished) return;
        if (timedOutEmitted) return;
        if (ctx.calledBack || ctx.error) return;

        timedOutEmitted = true;
        timedOut = true;
        ctx.error = true;

        callback = _noCallback;

        if (responseTimedOutHandler) {
          clearTimeout(responseTimedOutHandler);
          responseTimedOutHandler = undefined;
        }

        request.destroy();
        request = undefined as any;
        if (response) {
          response.socket.destroy();
          response = undefined as any;
        }

        emitter.emit('error', new Error(`Spidex timeout in ${rawOptions.timeout}ms.`));
      }, rawOptions.timeout);
    }

    /**
     * Handle errors emitted by the EventEmitter.
     *
     * This listener ensures that any errors emitted (except timeout errors) result in the immediate termination of the
     * request and cleanup of resources.
     */
    emitter.on('error', (err: Error) => {
      if (err.message.indexOf('timeout') !== -1) {
        return;
      }

      allFinished = true;
      timedOutEmitted = true;
      ctx.error = true;

      if (request) {
        request.destroy();
        request = undefined as any;
      }

      if (response) {
        response.socket.destroy();
        response = undefined as any;
      }

      if (timedOutHandler) {
        clearTimeout(timedOutHandler);
        timedOutHandler = undefined;
      }

      if (responseTimedOutHandler) {
        clearTimeout(responseTimedOutHandler);
        responseTimedOutHandler = undefined;
      }
    });

    /**
     * Set up a request timeout if specified in the options.
     *
     * This timeout ensures that the request phase (before receiving a response) completes within the specified time
     * limit. If the timeout is reached, the request is aborted, and an error is emitted.
     */
    if (rawOptions.requestTimeout) {
      request.setTimeout(rawOptions.requestTimeout, () => {
        if (response) return;
        if (timedOutEmitted) return;
        timedOutEmitted = true;

        requestTimedOut = true;
        callback = _noCallback;

        request.destroy();
        request = undefined as any;

        emitter.emit('error', new Error(`Spidex request timeout in ${rawOptions.requestTimeout}ms.`));
      });
    }

    /**
     * Write the request body and end the request for non-GET methods.
     *
     * For methods other than GET, this step sends the request body (if any) and signals the end of the request. The
     * body is written using the appropriate encoding (binary or default) based on the context.
     */
    if (method.toLowerCase() !== 'get') {
      if (!ctx.bodyEncode) {
        request.write(ctx.data);
      } else {
        request.write(ctx.data, ctx.bodyEncode);
      }
      request.end();
    }
  }

  /**
   * Call a Hessian v2 service.
   * @param url The URL of Hessian v2 service.
   * @param method The method name.
   * @param args The arguments.
   * @param options The request options.
   * @param [callback] The callback function.
   */
  hessianV2<R = any>(
    url: string,
    method: string,
    args: any[],
    options: SpidexRequestOptionsWithoutCharset,
    callback?: (err: Error | undefined, result?: R) => void
  ): void;

  /**
   * Call a Hessian v2 service without options.
   * @param url The URL of Hessian v2 service.
   * @param method The method name.
   * @param args The arguments.
   * @param [callback] The request callback.
   */
  hessianV2<R = any>(
    url: string,
    method: string,
    args: any[],
    callback?: (err: Error | undefined, result?: R) => void
  ): void;

  hessianV2<R = any>(
    url: string,
    method: string,
    args: any[],
    options?: SpidexRequestOptionsWithoutCharset | ((err: Error | undefined, result?: R) => void),
    callback?: (err: Error | undefined, result?: R) => void,
  ) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else if (!options) {
      options = {};
    }

    (async () => {
      const hessian = await load('hessian.js');
      if (!hessian) {
        if (typeof callback === 'function') {
          callback(new Error('Current environment does not support hessian.js'));
        }
        return;
      }

      // Refer to http://hessian.caucho.com/doc/hessian-ws.html#rfc.section.4.1.3
      //
      //     obj.add2(2, 3) call ->
      //
      //     H x02 x00    # Hessian 2.0
      //     C            # RPC call
      //       x04 add2   # method "add2"
      //       x92        # two arguments
      //       x92        # 2 - argument 1
      //       x93        # 3 - argument 2
      //
      // The very beginning of the request is `'H'`, `0x0200`, `'C'` and
      // `methodNameLength`.
      let buf = Buffer.from([ 'H'.charCodeAt(0), 0x02, 0x00, 'C'.charCodeAt(0), method.length ]);
      buf = Buffer.concat([ buf, Buffer.from(method), hessian.encode(args.length, '2.0') ]);

      for (const arg of args) {
        buf = Buffer.concat([ buf, hessian.encode(arg, '2.0') ]);
      }

      // {
      //     "header": {
      //         "content-type": "application/binary",
      //     },
      //     "charset": "binary",
      //     "data": <Buffer 0x48 0x02 0x00 0x43 ...>
      // }
      const realOptions: SpidexRequestOptions<'binary'> = _.cloneDeep(options);
      realOptions.header = realOptions.header || {};
      realOptions.header['content-type'] = 'application/binary';
      delete realOptions.header['content-length'];
      realOptions.data = buf;
      realOptions.charset = 'binary';

      this.post(url, realOptions, (content, status) => {
        if (status !== 200) {
          if (typeof callback === 'function') {
            callback(new Error(`Spidex response status code is ${status}`));
          }
          return;
        }

        let result;
        try {
          result = hessian.decode(content.slice(4), '2.0');
        } catch (e) {
          if (typeof callback === 'function') {
            callback(new Error([ e.message, content.toJSON() ].join(' ')));
          }
          return;
        }

        if (typeof callback === 'function') {
          callback(undefined, result);
        }
      }).on('error', err => {
        if (typeof callback === 'function') {
          callback(err);
        }
      });
    })().catch(err => {
      if (typeof callback === 'function') {
        callback(err);
      }
    });
  }
}
