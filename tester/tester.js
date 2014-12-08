/**
 * Created by XadillaX on 14-1-17.
 */
var spidex = require("../");

spidex.setDefaultUserAgent("Spidex v1.0 (node.js client)");
spidex.post("http://cnodejs.org/signin", function(html, status, respHeader) {
    var header = {
        cookie      : spidex.parseCookie(respHeader)
    };
    spidex.get("http://cnodejs.org/", function(html) {
        console.log(html);
    }, header, "utf8");
}, {
    name    : "yourusername",
    pass    : "yourpassword",
    csrf    : "undefined"
}, {}, "utf8", { requestTimeout: 10 }).on("error", function(err) {
    if(err) console.log(err.message);
});
