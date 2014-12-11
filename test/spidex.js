var spidex = require("../");
var imageType = require("image-type");
require("should");

describe("Spidex", function() {
    before(function(done) {
        spidex.setDefaultUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36");
        done();
    });

    describe("normal utf8 page", function() {
        this.timeout(0);

        it("should contain a certain sentence.", function(done) {
            spidex.get("https://www.upyun.com/index.html", function(html) {
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
                html.indexOf("No such user or wrong password.").should.not.equal(-1);
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
            spidex.get("http://nbut.edu.cn/", {
                charset: "gbk"
            }, function(html) {
                html.indexOf("宁波工程学院").should.not.equal(-1);
                done();
            }).on("error", function(err) {
                err.should.be.empty;
                done();
            });
        });

        it("should contain \"中國文化大學\"", function(done) {
            spidex.get("http://www.pccu.edu.tw/", {
                charset: "big5"
            }, function(html) {
                html.indexOf("中國文化大學").should.not.equal(-1);
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
            spidex.get("https://raw.githubusercontent.com/XadillaX/hexo-site/master/public/images/background/1.jpeg", {
                charset: "binary"
            }, function(buff) {
                imageType(buff).should.equal("jpg");
                done();
            }).on("error", function(err) {
                err.should.be.empty;
                done();
            });
        });
    });

    describe("timeout", function() {
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
            spidex.get("https://raw.githubusercontent.com/XadillaX/hexo-site/master/public/images/background/1.jpeg", {
                charset: "binary",
                responseTimeout: 10,
                timeout: 2000
            }, function(buff) {
                // empty
            }).on("error", function(err) {
                err.message.should.equal("Spidex response timeout in 10ms.");
                done();
            });
        });

        it("should timeout.", function(done) {
            spidex.get("https://raw.githubusercontent.com/XadillaX/hexo-site/master/public/images/background/1.jpeg", {
                charset: "binar",
                responseTimeout: 1000,
                requestTimeout: 1000,
                timeout: 200
            }, function(buff) {
                // empty
            }).on("error", function(err) {
                err.message.should.equal("Spidex timeout in 200ms.");
                done();
            });
        });
    });
});
