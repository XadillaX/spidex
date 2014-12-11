Spidex
======

The refactoring of `nodegrassex`. A web crawler for node.js.

Install
-------

```shell
$ npm install spidex
```

Usage
-----

You just need to get the handler:

```javascript
var spidex = require("spidex");
```

> After v2.0.0, spidex uses new APIs.

And the functions are:

```javascript
spidex.get(url, [opts], [callback]);
spidex.post(url, [opts], [callback]);
spidex.put(url, [opts], [callback]);
spidex.delete(url, [opts], [callback]);
```

`opts` can be an `Object` that has options follow:

+ `data`: the body data. it may be a querystring or a JSON object.
+ `header`: customized request header.
+ `charset`: "utf8", "gbk", "big5" or other encodings `iconv-lite` supported. what's more, it supports "binary" now.
+ `timeout`: set the totally timeout millionsecond.
+ `responseTimeout`: set the response timeout millionsecond.
+ `requestTimeout`: set the request timeout millionsecond.

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

License
-------

The MIT License (MIT)

Copyright (c) 2014 ZHU, Kaidi

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
