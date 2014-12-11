/**
 * Created by XadillaX on 14-1-17.
 */
var EventEmitter = require("events").EventEmitter;
var iconv = require("iconv-lite");
var urlHelper = require("url");
var http = require("http");
var https = require("https");
var statics = require("./statics");
var urlencode = require("urlencode");

function _noCallback() {}

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
        "user-agent"    : statics.userAgent
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

Spidex.prototype.delete = function(url, opts, callback) {
    return this.method("delete", url, opts, callback);
};

Spidex.prototype.put = function(url, opts, callback) {
    return this.method("put", url, opts, callback);
};

Spidex.prototype.post = function(url, opts, callback) {
    return this.method("post", url, opts, callback);
};

Spidex.prototype.get = function(url, opts, callback) {
    return this.method("get", url, opts, callback);
};

Spidex.prototype.method = function(method, url, opts, callback) {
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
        header["content-length"] = data.length;
    }
    if(!header["content-type"] && method.toLowerCase() !== "get") {
        header["content-type"] = "application/x-www-form-urlencoded";
    }

    // the returned object
    var emitter = new EventEmitter();

    var p = ((protocol === "http:") ? http : ((protocol === "https:") ? https : null));
    if(!p) {
        emitter.emit(new Error("This protocol is not supported yet."));
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

            callback(content, status, headers);
        });
    });

    // on error
    request.on("error", function(err) {
        if(timeouted || requestTimeouted || responseTimeout) return;
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

module.exports = Spidex;

