# Spidex

![npm version](https://img.shields.io/npm/v/spidex.svg)
![npm downloads](https://img.shields.io/npm/dm/spidex.svg)
![Build Status](https://github.com/XadillaX/spidex/workflows/Node.js%20CI/badge.svg)
![Coverage Status](https://img.shields.io/coveralls/XadillaX/spidex/master.svg)

Spidex is a versatile web requester for Node.js and browsers, designed to simplify HTTP requests with a clean and
intuitive API.

## Features

- Supports both Node.js and browser environments.
- Handles GET, POST, PUT, DELETE and other methods.
- Customizable request options including headers, timeouts, and charsets.
- Built-in support for various character encodings.
- Hessian v2 protocol support (Node.js only).
- Event-based error handling.

## Installation

Install Spidex using npm:

```bash
npm install spidex --save
```

## Usage

### Basic Request

```js
const spidex = require('spidex');

spidex.get('https://api.example.com/data', (content, statusCode, responseHeaders) => {
  console.log('Response:', content);
  console.log('Status:', statusCode);
  console.log('Headers:', responseHeaders);
}).on('error', err => {
  console.error('Error:', err);
});
```

### Request with Options

```js
spidex.post('https://api.example.com/users', {
  data: JSON.stringify({ username: 'john_doe', email: 'john@example.com' }),
  header: { 'Content-Type': 'application/json' },
  charset: 'utf8',
  timeout: 5000
}, (content, statusCode, responseHeaders) => {
  console.log('User created:', content);
}).on('error', (err) => {
  console.error('Error creating user:', err);
});
```

### Supported Basic HTTP Methods

Spidex supports the following HTTP methods:

- `spidex.get(url, [options], [callback])`
- `spidex.post(url, [options], [callback])`
- `spidex.put(url, [options], [callback])`
- `spidex.delete(url, [options], [callback])`

Each method returns an EventEmitter that emits an 'error' event if an error occurs.

### Supported Other HTTP Methods

- `spidex.method(url, method, [options], [callback])`

### Request Options

The `options` object can include the following properties:

- `data`: Request body (string, object, or Buffer)
- `header`: Custom request headers
- `charset`: Character encoding (e.g., 'utf8', 'gbk', 'binary', etc.)
- `timeout`: Total request timeout in milliseconds
- `responseTimeout`: Response timeout in milliseconds
- `requestTimeout`: Request timeout in milliseconds

### Parsing Cookies

Spidex provides a utility function to parse cookies from response headers:

```js
const cookies = spidex.parseCookies(responseHeaders);
console.log('Parsed cookies:', cookies);
```

### User Agent Management

You can get or set the default User-Agent string:

```js
// Get the current User-Agent
const currentUA = spidex.getDefaultUserAgent();

// Set a custom User-Agent
spidex.setDefaultUserAgent('MyApp/1.0');
```

### Hessian v2 Support (Node.js only)

Spidex supports Hessian v2 protocol for Node.js environments:

```js
spidex.hessianV2('http://hessian.example.com/api', 'methodName', [arg1, arg2], (err, result) => {
  if (err) {
    console.error('Hessian request failed:', err);
    return;
  }
  console.log('Hessian result:', result);
});
```

## TypeScript Support

Spidex includes TypeScript definitions. You can import and use it in TypeScript projects:

```ts
import * as spidex from 'spidex';

spidex.get('https://api.example.com/data', (content, statusCode, responseHeaders) => {
  console.log('Typed response:', content);
});
```

## Error Handling

All Spidex methods return an EventEmitter that emits an 'error' event. You can handle errors by listening to this event:

```js
spidex.get('https://api.example.com/data')
  .on('error', (err) => {
    console.error('Request failed:', err);
  });
```

## License

Spidex is released under the MIT License. See the [LICENSE](LICENSE) file for details.
