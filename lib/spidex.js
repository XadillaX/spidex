/**
 * Created by XadillaX on 14-1-17.
 */
var iconv = require("iconv-lite");
var urlHelper = require("url");
var http = require("http");
var https = require("https");
var statics = require("./statics");
var querystring = require("querystring");

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
        newHeader[key.toLowerCase()] = header[key];
    }

    return newHeader;
};

Spidex.prototype.post = function(url, callback, data, header, charset) {
    var urlObject = urlHelper.parse(url);
    var protocol = urlObject.protocol;
    var defaultCharset = "utf8";
    var content = "";
    if(typeof charset === "string") {
        defaultCharset = charset;
    }
    if(typeof header === "string") {
        defaultCharset = header;
    }

    data = querystring.stringify(data);

    var newHeader = this._combineHeader(header);
    if(!newHeader["content-length"]) {
        newHeader["content-length"] = data.length;
    }
    if(!newHeader["content-type"]) {
        newHeader["content-type"] = "application/x-www-form-urlencoded";
    }

    var options = {
        host    : urlObject.hostname,
        port    : urlObject.port,
        path    : urlObject.path,
        headers : newHeader,
        method  : "post"
    };

    var p = ((protocol === "http:") ? http : ((protocol === "https:") ? https : null));
    if(p === null) {
        throw new Error("This protocol is not supported yet.");
    }

    var req = p.request(options, function(res) {
        var status = res.statusCode;
        var headers = res.headers;
        if(defaultCharset === "gbk") {
            res.setEncoding("binary");
        } else {
            res.setEncoding(defaultCharset);
        }

        res.on("data", function(chunk) {
            content += chunk;
        });

        res.on("end", function() {
            if(defaultCharset === "gbk") {
                content = iconv.decode(new Buffer(content, "binary"), "gbk");
            }

            callback(content, status, headers);
        });
    });

    req.write(data + "\n");
    req.end();
    return req;
};

/**
 * the `get` method
 * @param url
 * @param callback
 * @param header
 * @param charset
 * @returns {*}
 */
Spidex.prototype.get = function(url, callback, header, charset) {
    var urlObject = urlHelper.parse(url);
    var protocol = urlObject.protocol;
    var defaultCharset = "utf8";
    var content = "";

    // charset
    if(typeof charset === "string") {
        defaultCharset = charset;
    }
    if(typeof header === "string") {
        defaultCharset = header;
    }

    // response header
    var newHeader = this._combineHeader(header);
    newHeader["content-length"] = 0;

    var options = {
        host    : urlObject.hostname,
        port    : urlObject.port,
        path    : urlObject.path,
        headers : newHeader
    };

    var p = ((protocol === "http:") ? http : ((protocol === "https:") ? https : null));
    if(p === null) {
        throw new Error("This protocol is not supported yet.");
    }

    return p.get(options, function(res) {
        var status = res.statusCode;
        var headers = res.headers;
        if(defaultCharset === "gbk") {
            res.setEncoding("binary");
        } else {
            res.setEncoding(defaultCharset);
        }

        res.on("data", function(chunk) {
            content += chunk;
        });

        res.on("end", function() {
            if(defaultCharset === "gbk") {
                content = iconv.decode(new Buffer(content, "binary"), "gbk");
            }

            callback(content, status, headers);
        });
    });
};

module.exports = Spidex;
