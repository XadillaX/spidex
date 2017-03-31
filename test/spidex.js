"use strict";

var spidex = require("../");
var imageType = require("image-type");
require("should");

describe("Spidex", function() {
    before(function(done) {
        spidex.setDefaultUserAgent(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X " + 
                "10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) " + 
                "Chrome/39.0.2171.71 Safari/537.36");

        done();
    });

    describe("normal utf8 page", function() {
        this.timeout(0);

        it("should contain a certain sentence.", function(done) {
            spidex.get("https://www.upyun.com/", function(html) {
                html.indexOf("又拍云").should.not.equal(-1);
                done();
            }).on("error", function(err) {
                err.should.be.empty;
                done();
            });
        });

        it("should be wrong username and password.", function(done) {
            spidex.post("http://acm.hdu.edu.cn/userloginex.php?action=login", {
                data: {
                    username: "fake!",
                    password: "fake!",
                    login: "Sign In"
                }
            }, function(html, status) {
                status.should.equal(200);
                html.indexOf("No such user or wrong password.")
                    .should.not.equal(-1);

                done();
            }).on("error", function(err) {
                err.should.be.empty;
                done();
            });
        });
    });

    describe("other encoding page", function() {
        this.timeout(0);

        it("should contain \"宁波工程学院\"", function(done) {
            spidex.get("http://dx.nbut.edu.cn/", {
                charset: "gbk"
            }, function(html) {
                html.indexOf("宁波工程学院").should.not.equal(-1);
                done();
            }).on("error", function(err) {
                err.should.be.empty;
                done();
            });
        });

        it("should contain \"玄奘大學\"", function(done) {
            spidex.get("http://a001.hcu.edu.tw/front/bin/home.phtml", {
                charset: "big5"
            }, function(html) {
                html.indexOf("玄奘大學").should.not.equal(-1);
                done();
            }).on("error", function(err) {
                err.should.be.empty;
                done();
            });
        });
    });

    describe("binary file", function() {
        this.timeout(0);

        it("should be a JPEG file", function(done) {
            spidex.get(
                "https://raw.githubusercontent.com/XadillaX/hexo-site/" +
                "ad93217883a6e6ff1dd7136c6f3b732290e16d6d/public/images/background/1.jpeg", {
                    charset: "binary"
                }, function(buff) {
                    imageType(buff).should.eql({
                        ext: "jpg",
                        mime: "image/jpeg"
                    });
                    done();
                }).on("error", function(err) {
                    err.should.be.empty;
                    done();
                });
        });
    });

    describe("timeout", function() {
        this.timeout(0);

        it("should request timeout.", function(done) {
            spidex.get("http://www.pccu.edu.tw/", {
                requestTimeout: 10,
                timeout: 100
            }, function() {
                // empty
            }).on("error", function(err) {
                err.message.should.equal("Spidex request timeout in 10ms.");
                done();
            });
        });

        it("should response timeout.", function(done) {
            spidex.get(
                "https://raw.githubusercontent.com/XadillaX/hexo-site/" +
                "ad93217883a6e6ff1dd7136c6f3b732290e16d6d/public/images/background/1.jpeg", {
                    charset: "binary",
                    responseTimeout: 10,
                    timeout: 2000
                }, function() {
                    // empty
                }).on("error", function(err) {
                    err.message.should.equal("Spidex response timeout in 10ms.");
                    done();
                });
        });

        it("should timeout.", function(done) {
            spidex.get(
                "https://raw.githubusercontent.com/XadillaX/hexo-site/" +
                "master/public/images/background/1.jpeg", {
                    charset: "binary",
                    responseTimeout: 1000,
                    requestTimeout: 1000,
                    timeout: 20
                }, function() {
                    // empty
                }).on("error", function(err) {
                    err.message.should.equal("Spidex timeout in 20ms.");
                    done();
                });
        });

        it("shouldn't call timeout.", function(done) {
            var errorOccurred = 0;
            this.timeout(5000);
            spidex.get("http://zhaofulifxxkfxxkfxxkfxxk.org/", {
                timeout: 1000
            }, function() {
                // empty
            }).on("error", function(err) {
                err.message.should.not.equal("Spidex timeout in 1000ms.");
                errorOccurred = 1;
            });

            setTimeout(function() {
                errorOccurred.should.not.equal(0);
                done();
            }, 3000);
        });
    });

    describe("post", function() {
        it("should return whole data when POST utf8", function(done) {
            spidex.post("http://httpbin.org/post", {
                timeout: 60000,
                data: "a=你好",
                charset: "utf8"
            }, function(html) {
                var json = JSON.parse(html);
                json.form.a.should.equal("你好");
                done();
            }).on("error", function(err) {
                err.should.be.empty;
            });
        });
    });

    describe("errors", function() {
        it("should occur an invaid protocol error.", function(done) {
            spidex.get("$$$$$", {
                timeout: 1
            }, function() {
                // empty
            }).on("error", function(err) {
                err.message.indexOf("protocol").should.not.equal(-1);
                done();
            });
        });
    });
});
