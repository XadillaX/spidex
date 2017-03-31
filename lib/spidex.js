/**
 * Created by XadillaX on 14-1-17.
 */
var isNode = false;
try {
    isNode = (process.release.name === "node" || process.release.name === "io.js");
} catch(e) {
    isNode = false;
}

var EventEmitter = require("eventemitter2").EventEmitter2;
var urlHelper = require("url");

var http = require(isNode ? "http" : "stream-http");
var https = require(isNode ? "https" : "https-browserify");

var hessian = isNode ? require("hessian.js") : {};
var iconv = require("iconv-lite");
var urlencode = require("urlencode");
var 囍 = require("lodash");

var statics = require("./statics");

function _noCallback() {}

/**
 * Spidex
 * @constructor
 */
var Spidex = function() {
};

/**
 * combine the new response header
 * @param header
 * @returns {{user-agent: (userAgent|*)}}
 * @private
 */
Spidex.prototype._combineHeader = function(header) {
    var newHeader = {
        "user-agent": statics.userAgent
    };

    if(typeof header === "string") {
        return newHeader;
    }

    for(var key in header) {
        if(header.hasOwnProperty(key)) {
            newHeader[key.toLowerCase()] = header[key];
        }
    }

    return newHeader;
};

/**
 * delete
 * @param {String} url the request url
 * @param {Object} [opts] the request object
 * @param {Function} callback the callback function
 * @return {EventEmitter} the event emitter object
 */
Spidex.prototype.delete = function(url, opts, callback) {
    return this.method("delete", url, opts, callback);
};

/**
 * put
 * @param {String} url the request url
 * @param {Object} [opts] the request object
 * @param {Function} callback the callback function
 * @return {EventEmitter} the event emitter object
 */
Spidex.prototype.put = function(url, opts, callback) {
    return this.method("put", url, opts, callback);
};

/**
 * post
 * @param {String} url the request url
 * @param {Object} [opts] the request object
 * @param {Function} callback the callback function
 * @return {EventEmitter} the event emitter object
 */
Spidex.prototype.post = function(url, opts, callback) {
    return this.method("post", url, opts, callback);
};

/**
 * get
 * @param {String} url the request url
 * @param {Object} [opts] the request object
 * @param {Function} callback the callback function
 * @return {EventEmitter} the event emitter object
 */
Spidex.prototype.get = function(url, opts, callback) {
    return this.method("get", url, opts, callback);
};

/**
 * method
 * @param {String} method the request method
 * @param {String} url the request url
 * @param {Object} [opts] the request object
 * @param {Function} callback the callback function
 * @return {EventEmitter} the event emitter object
 */
Spidex.prototype.method = function(method, url, opts, callback) {
    var callbacked = false;

    if(typeof opts === "function") {
        callback = opts;
        opts = {};
    }
    if(undefined === callback) callback = _noCallback;
    opts = opts || {};

    // parse url & its protocol
    var urlObject = urlHelper.parse(url);
    var protocol = urlObject.protocol;

    // charset
    var charset = opts.charset || "utf8";

    // data
    var bodyEncode = null;
    var data = opts.data || "";
    if(data instanceof Buffer) {
        // if it's raw data
        bodyEncode = "binary";
    } else if(typeof data === "object") {
        // if it's object then stringify it
        data = urlencode.stringify(data, { charset: charset });
    }

    // header
    var header = this._combineHeader(opts.header || {});
    if(!header["content-length"]) {
        header["content-length"] = (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
    }
    if(!header["content-type"] && method.toLowerCase() !== "get") {
        header["content-type"] = "application/x-www-form-urlencoded";
    }

    // the returned object
    var emitter = new EventEmitter();

    var p = ((protocol === "http:") ? http : ((protocol === "https:") ? https : null));
    if(!p) {
        process.nextTick(function() {
            emitter.emit("error", new Error("This protocol is not supported yet."));
        });
        return emitter;
    }

    var options = {
        host               : urlObject.hostname,
        port               : urlObject.port,
        path               : urlObject.path,
        headers            : header,
        method             : method,
        rejectUnauthorized : false
    };

    // some variables for timeout
    var allFinished      = false;
    var timeouted        = false;
    var requestTimeouted = false;
    var responseTimeout  = false;
    var timeoutEmitted   = false;
    var timeoutHandler;
    var responseTimeoutHandler;

    var response;
    var call = "request";
    if(method.toLowerCase() === "get") {
        call = "get";
        delete options.method;
    }
    var request = p[call](options, function(_response) {
        response = _response;

        // timeout for response
        if(opts.responseTimeout) {
            responseTimeoutHandler = setTimeout(function() {
                if(allFinished) return;
                if(timeoutEmitted) return;
                timeoutEmitted  = true;
                responseTimeout = true;
                callback        = _noCallback;

                if(timeoutHandler) {
                    clearTimeout(timeoutHandler);
                    timeoutHandler = undefined;
                }

                // destroy request and response (incomming message) object
                request.destroy();
                request = undefined;
                response.socket.destroy();
                response = undefined;

                // emit error
                emitter.emit("error", new Error("Spidex response timeout in " + opts.responseTimeout + "ms."));
            }, opts.responseTimeout);
        }

        var content = "";
        var status = response.statusCode;
        var headers = response.headers;
        response.setEncoding(charset === "utf8" ? "utf8" : "binary");
        response.on("data", function(chunk) {
            content += chunk;
        });
        response.on("end", function() {
            allFinished = true;

            // clear some timeout handlers
            if(responseTimeoutHandler) {
                clearTimeout(responseTimeoutHandler);
                responseTimeoutHandler = undefined;
            }
            if(timeoutHandler) {
                clearTimeout(timeoutHandler);
                timeoutHandler = undefined;
            }

            // clear request and response
            request = undefined;
            response = undefined;

            // iconv
            if(charset === "binary") {
                content = new Buffer(content, "binary");
            } else if(charset !== "utf8") {
                content = iconv.decode(new Buffer(content, "binary"), charset);
            }

            if(!callbacked) {
                callbacked = true;
                callback(content, status, headers);
            }
        });
    });

    // on error
    request.on("error", function(err) {
        if(timeouted || requestTimeouted || responseTimeout || callbacked) return;
        callbacked = true;
        emitter.emit("error", err);
    });

    // process timeout
    if(opts.timeout) {
        timeoutHandler = setTimeout(function() {
            if(allFinished) return;
            if(timeoutEmitted) return;

            timeoutEmitted = true;
            timeouted      = true;
            callback       = _noCallback;

            if(responseTimeoutHandler) {
                clearTimeout(responseTimeoutHandler);
                responseTimeoutHandler = undefined;
            }

            // destroy request and response (incomming message) object
            request.destroy();
            request = undefined;
            if(response) {
                response.socket.destroy();
                response = undefined;
            }

            // emit error
            emitter.emit("error", new Error("Spidex timeout in " + opts.timeout + "ms."));
        }, opts.timeout);
    }

    // push an error event function to emitter
    //
    // the event functions will be called one by one while sync
    //
    // clear all timeout error listener if it's not timeout error
    emitter.on("error", function(err) {
        if(err.message === "timeout") return;

        allFinished = true;
        timeoutEmitted = true;
        if(request) request.destroy();
        request = undefined;

        if(response) {
            response.socket.destroy();
            response = undefined;
        }

        if(timeoutHandler) {
            clearTimeout(timeoutHandler);
            timeoutHandler = undefined;
        }

        if(responseTimeoutHandler) {
            clearTimeout(responseTimeoutHandler);
            responseTimeoutHandler = undefined;
        }
    });

    if(opts.requestTimeout) {
        request.setTimeout(opts.requestTimeout, function() {
            if(response) return;
            if(timeoutEmitted) return;
            timeoutEmitted = true;

            requestTimeouted = true;
            callback = _noCallback;

            request.destroy();
            request = undefined;
            if(response) {
                response.socket.destroy();
                response = undefined;
            }

            // emit error
            emitter.emit("error", new Error("Spidex request timeout in " + opts.requestTimeout + "ms."));
        });
    }

    // write request
    if("get" !== method.toLowerCase()) {
        if(!bodyEncode) {
            request.write(data);
        } else {
            request.write(data, bodyEncode);
        }
        request.end();
    }

    return emitter;
};

/**
 * hessianV2
 * @param {String} url the request url
 * @param {String} method the hessian method name
 * @param {Array} args request arguments
 * @param {Object} [opts] the request option
 * @param {Function} callback the callback function
 */
Spidex.prototype.hessianV2 = function(url, method, args, opts, callback) {
    if(typeof opts === "function") {
        callback = opts;
        opts = {};
    }

    // refer to
    // http://hessian.caucho.com/doc/hessian-ws.html#rfc.section.4.1.3
    //
    // the example shows that:
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
    // so the very beginning is `"H"`, `0x0200`, `"C"`, `methodNameLength`
    var buf = new Buffer([ "H".charCodeAt(), 0x02, 0x00, "C".charCodeAt(), method.length ]);

    // method name
    buf = Buffer.concat([ buf, new Buffer(method) ]);

    // encode argument length as hessian2.0
    buf = Buffer.concat([ buf, hessian.encode(args.length, "2.0") ]);

    // encode each argument
    for(var i = 0; i < args.length; i++) {
        buf = Buffer.concat([ buf, hessian.encode(args[i], "2.0") ]);
    }

    // {
    //     "header": {
    //         "content-type": "application/binary",
    //     },
    //     "charset": "binary",
    //     "data": <Buffer 0x48 0x02 0x00 0x43 ...>
    // }
    opts = 囍.cloneDeep(opts);
    opts.header = opts.header || {};
    opts.header["content-type"] = "application/binary";
    delete opts.header["content-length"];
    opts.data = buf;
    opts.charset = "binary";

    this.post(url, opts, function(content, status) {
        if(200 !== status) {
            return callback(new Error(content.toString()));
        }

        // decode hessian 2.0 package
        var result;
        try {
            result = hessian.decode(content.slice(4), "2.0");
        } catch(e) {
            var str = e.message;
            str += " " + content.toJSON();
            return callback(new Error(str));
        }

        callback(undefined, result);
    }).on("error", callback);
};

module.exports = Spidex;
