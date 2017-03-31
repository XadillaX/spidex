# Spidex

[![Spidex](http://img.shields.io/npm/v/spidex.svg)](https://www.npmjs.org/package/spidex) [![Spidex](http://img.shields.io/npm/dm/spidex.svg)](https://www.npmjs.org/package/spidex) [![Build Status](https://travis-ci.org/XadillaX/spidex.svg?branch=v2)](https://travis-ci.org/XadillaX/spidex) [![Coverage Status](https://img.shields.io/coveralls/XadillaX/spidex/v2.svg)](https://coveralls.io/r/XadillaX/spidex?branch=v2)

A web requester for Node.js / Browser.

[![Spidex](https://nodei.co/npm/spidex.png?downloads=true&downloadRank=true)](https://www.npmjs.org/package/spidex) [![Spidex](https://nodei.co/npm-dl/spidex.png?months=6&height=3)](https://nodei.co/npm-dl/spidex.png?months=6&height=3)

## Installation

```sh
$ npm install spidex --save
```

## Usage

You just need to get the handler:

```javascript
var spidex = require("spidex");
```

> After v2.0.0, spidex uses new APIs.

And the functions are:

```javascript
spidex.get(url, [opts], [callback]).on("error", errorCallback);
spidex.post(url, [opts], [callback]).on("error", errorCallback);
spidex.put(url, [opts], [callback]).on("error", errorCallback);
spidex.delete(url, [opts], [callback]).on("error", errorCallback);
```

`opts` can be an `Object` that has options follow:

+ `data`: the body data. it may be a querystring or a JSON object.
+ `header`: customized request header.
+ `charset`: "utf8", "gbk", "big5" or other encodings `iconv-lite` supported. what's more, it supports "binary" now.
+ `timeout`: set the totally timeout millionsecond.
+ `responseTimeout`: set the response timeout millionsecond.
+ `requestTimeout`: set the request timeout millionsecond.

For an example:

```javascript
spidex.post("http://foo", {
    data: { user: "foo", password: "bar" },
    header: { "content-type": "application/x-www-form-urlencoded" },
    charset: "utf8",
    timeout: 5000,
    responseTimeout: 3000,
    requestTimeout: 3000
}, function(content, statusCode, responseHeaders) {
    console.log(content, statusCode, responseHeaders);
}).on("error", function(err) {
    console.log(err);
});
```

There's a helper function:

```javascript
spidex.parseCookie(responseHeaders);
```

And two `user-agent` functions:

```javascript
spidex.setDefaultUserAgent(userAgent);
spidex.getDefaultUserAgent();
```

You can go through `test/spidex.js` for further examples.

### Hessian V2

> After v2.1.0, spidex support for [Hessian](http://hessian.caucho.com/) 2.0 request!
>
> **Important:** Node.js **ONLY**!

```javascript
spidex.hessianV2(url, method, args, opts, callback);
```

> `opts` is the same as other functions in spidex, but it will ignore parameters 
> `data` and `header["content-length"]`.
>
> `args` is an array of arguments that will fill in the hessian service.
>
> `method` is the method name of that hessian service.

For an example, a possible request may like this:

```javascript
spidex.hessianV2("http://hessian.caucho.com/test/test2", "argTrue", [ true ], function(err, result) {
    console.log(err, result);
});
```

## License

The MIT License (MIT)

Copyright (c) 2017 ZHU, Kaidi

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
