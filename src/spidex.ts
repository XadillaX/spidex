import { isPromise } from 'util/types';

import * as _ from 'lodash';
import { EventEmitter } from 'eventemitter3';
import * as iconv from 'iconv-lite';
import * as urlencode from 'urlencode';

import { SpidexSupportedCharset } from './SpidexSupportedCharset';
import * as statics from './statics';

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

async function load<K extends keyof typeof mod>(type: K): Promise<typeof mod[K]> {
  if (mod[type] !== undefined) {
    return mod[type];
  }

  if (isNode) {
    mod[type] = import(type);
  } else {
    switch (type) {
      case 'http':
        mod[type] = import('stream-http');
        break;
      case 'https':
        mod[type] = import('https-browserify');
        break;
      case 'hessian.js':
        mod['hessian.js'] = null;
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }

  if (isPromise(mod[type])) {
    mod[type] = await mod[type];
  }

  return mod[type];
}

function _noCallback() {}

export type SpidexBasicHTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type SpidexURLDecodedObject = Record<string, string>;

export interface SpidexRequestOptionsWithoutCharset {
  data?: Buffer | string | SpidexURLDecodedObject;
  header?: import('http').OutgoingHttpHeaders;

  timeout?: number;
  responseTimeout?: number;
  requestTimeout?: number;
}

export interface SpidexRequestOptions<C extends SpidexSupportedCharset> extends SpidexRequestOptionsWithoutCharset {
  charset?: C;
}

export type SpidexRequestCallbackContentType<C extends SpidexSupportedCharset> = C extends 'binary' ? Buffer : string;
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


export class Spidex extends EventEmitter {
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

  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: SpidexBasicHTTPMethod,
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: SpidexBasicHTTPMethod,
    url: string,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
  method<C extends SpidexSupportedCharset = 'utf8'>(
    method: string,
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
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
      process.nextTick(() => {
        emitter.emit('error', e);
      });
      return emitter;
    }

    const protocol = urlObject.protocol;
    const charset = options.charset || 'utf8';
    ctx.charset = charset;

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

    this.doRequest(ctx, p as any, method, realOptions, options, emitter, callback).catch(err => {
      if (ctx.calledBack || ctx.error) {
        return;
      }
      emitter.emit('error', err);
    });

    return emitter;
  }

  delete<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
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

  get<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
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

  post<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
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

  put<C extends SpidexSupportedCharset = 'utf8'>(
    url: string,
    options?: SpidexRequestOptions<C>,
    callback?: SpidexRequestCallback<C>,
  ): EventEmitter<{
    error: [Error];
  }>;
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

    let call: 'request' | 'get' = 'request';
    if (method.toLowerCase() === 'get') {
      call = 'get';
      delete options.method;
    }

    const mod = await requester;
    let response: import('http').IncomingMessage;
    let request: import('http').ClientRequest = mod[call](options, resp => {
      response = resp;

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

    request.on('error', err => {
      if (timedOut || requestTimedOut || responseTimedOut || ctx.error || ctx.calledBack) return;
      ctx.error = true;
      emitter.emit('error', err);
    });

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

    if (method.toLowerCase() !== 'get') {
      if (!ctx.bodyEncode) {
        request.write(ctx.data);
      } else {
        request.write(ctx.data, ctx.bodyEncode);
      }
      request.end();
    }
  }

  hessianV2<R = any>(url: string, method: string, args: any[], options: SpidexRequestOptionsWithoutCharset, callback?: (err: Error | undefined, result?: R) => void): void;
  hessianV2<R = any>(url: string, method: string, args: any[], callback?: (err: Error | undefined, result?: R) => void): void;
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
