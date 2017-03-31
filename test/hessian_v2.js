/**
 * XadillaX created at 2015-11-04 10:31:13 With ♥
 *
 * Copyright (c) 2017 Souche.com, all rights
 * reserved.
 */
"use strict";

require("es6-map-shim");
var Long = require("long");
var should = require("should");

var spidex = require("../");

describe("Hessian 2.0 test", function() {
    var BASE_URL = "http://hessian.caucho.com/test/test2";
    this.timeout(0);

    function TEST_REPLY(method, reply, callback) {
        spidex.hessianV2(BASE_URL, method, [], function(err, result) {
            should.ifError(err);
            if(typeof reply !== "function") should(result).be.eql(reply);
            else reply(result);

            callback();
        });
    }

    function TEST_ARGS(method, args, callback) {
        spidex.hessianV2(BASE_URL, method, args, function(err, result) {
            should.ifError(err);
            if(result !== true) console.log(result);
            should(result).be.eql(true);
            callback();
        });
    }

    describe("boolean | null", function() {
        it("should method null", function(callback) {
            spidex.hessianV2(BASE_URL, "methodNull", [], function(err, result) {
                should.ifError(err);
                should(result).be.null;
                callback();
            });
        });

        it("should reply null", TEST_REPLY.bind(this, "replyNull", null));
        it("should reply true", TEST_REPLY.bind(this, "replyTrue", true));
        it("should reply false", TEST_REPLY.bind(this, "replyFalse", false));

        it("should send null", TEST_ARGS.bind(this, "argNull", [null]));
        it("should send true", TEST_ARGS.bind(this, "argTrue", [true]));
        it("should send false", TEST_ARGS.bind(this, "argFalse", [false]));
    });

    describe("list", function() {
        [ 0, 1, 7, 8 ].forEach(function(len) {
            var list = [];
            for(var i = 0; i < len; i++) {
                list.push((i + 1).toString());
            }

            (function(i) {
                it("should send untyped list " + i, TEST_ARGS.bind(this, "argUntypedFixedList_" + i, [ list ]));

                var _list = {
                    $class: "[string",
                    $: list.map(function(s) {
                        return { $class: "string", $: s };
                    })
                };
                it("should send typed list " + i, TEST_ARGS.bind(this, "argTypedFixedList_" + i, [ _list ]));
            })(i);
        });
    });

    describe("map", function() {
        var maps = [
            {},
            { a: 0 },
            { "0": "a", "1": "b" },
            { a: 0 }
        ];

        var typedMaps = [
            { $class: "java.util.Hashtable", $: {} },
            { $class: "java.util.Hashtable", $: { a: 0 } },
            new Map(),
            new Map()
        ];

        typedMaps[2].set(0, "a");
        typedMaps[2].set(1, "b");
        typedMaps[3].set(["a"], 0);

        [ 0, 1, 2, 3 ].forEach(function(i) {
            (function(i) {
                it("should reply typed map " + i, TEST_REPLY.bind(this, "replyTypedMap_" + i, function(res) {
                    res.should.be.eql(maps[i]);
                }));

                it("should reply untyped map " + i, TEST_REPLY.bind(this, "replyUntypedMap_" + i, function(res) {
                    res.should.be.eql(maps[i]);
                }));

                it("should send typed map " + i, TEST_ARGS.bind(this, "argTypedMap_" + i, [ typedMaps[i] ]));
                it("should send untyped map " + i, TEST_ARGS.bind(this, "argUntypedMap_" + i, [ typedMaps[i] ]));
            })(i);
        });
    });

    describe("object", function() {
        it("should send object 0", TEST_ARGS.bind(this, "argObject_0", [
            { $class: "com.caucho.hessian.test.A0", $: {} }
        ]));

        it("should reply object 0", TEST_REPLY.bind(this, "replyObject_0", {}));

        var testClass = "com.caucho.hessian.test.TestObject";
        it("should send object 1", TEST_ARGS.bind(this, "argObject_1", [
            { $class: testClass, $: { _value: 0 } }
        ]));

        it("should reply object 1", TEST_REPLY.bind(this, "replyObject_1", { _value: 0 }));

        it("should send object 2", TEST_ARGS.bind(this, "argObject_2", [
            [{ $class: testClass, $: { _value: 0 } }, { $class: testClass, $: { _value: 1 } }]
        ]));

        it("should send object 2a", TEST_ARGS.bind(this, "argObject_2a", [
            [{ $class: testClass, $: { _value: 0 } }, { $class: testClass, $: { _value: 0 } }]
        ]));

        it("should send object 2b", TEST_ARGS.bind(this, "argObject_2b", [
            [{ $class: testClass, $: { _value: 0 } }, { $class: testClass, $: { _value: 0 } }]
        ]));

        var obj3 = { $class: "com.caucho.hessian.test.TestCons", $: { _first: "a", _rest: null } };
        obj3.$._rest = obj3;

        it("should send object 3", TEST_ARGS.bind(this, "argObject_3", [ obj3 ]));
    });

    describe("date", function() {
        var dates = [
            new Date(0),
            new Date(Date.UTC(98, 4, 8, 9, 51, 31)),
            new Date(Date.UTC(98, 4, 8, 9, 51))
        ];

        for(var i = 0; i < dates.length; ++i) {
            it("should send date 0", TEST_ARGS.bind(this, "argDate_" + i, [ dates[i] ]));
            it("should reply date 0", TEST_REPLY.bind(this, "replyDate_" + i, dates[i]));
        }
    });

    describe("binary", function() {
        var buf1023, ss = [];
        for(var i = 0; i < 16; i++) {
            ss.push(
                "" + parseInt(i / 10, 10) + (i % 10) +
                " 456789012345678901234567890123456789012345678901234567890123\n");
        }

        buf1023 = new Buffer(ss.join("").substr(0, 1023));

        [ 
            new Buffer(0),
            new Buffer("012345678901234"),
            new Buffer("0123456789012345"),
            buf1023
        ].forEach(function(arg) {
            var len = arg.length;
            it("should send binary " + len, TEST_ARGS.bind(this, "argBinary_" + len, [ arg ]));
        });
    });

    describe("string", function() {
        [ 0, 1, 31, 32, 1023, 1024, 65536 ].forEach(function(length) {
            var str;
            if(length <= 32) {
                str = new Array(Math.ceil(length / 10)).join("0123456789");
                var rest = length % 10;
                for(var i = 0; i < rest; ++i) {
                    str += i + "";
                }
            } else if(length <= 1024) {
                var ss = [];
                for(var i = 0; i < 16; i++)
                    ss.push(
                        "" + parseInt(i / 10, 10) + (i % 10) +
                        " 456789012345678901234567890123456789012345678901234567890123\n");

                str = ss.join("").substring(0, length);
            } else {
                var ss = [];
                for(var i = 0; i < 64 * 16; i++)
                    ss.push(
                        "" + parseInt(i / 100, 10) + (parseInt(i / 10, 10) % 10) +
                        (i % 10) + " 56789012345678901234567890123456789012345678901234567890123\n");

                str = ss.join("").substring(0, length);
            }

            it("should send string " + length, TEST_ARGS.bind(this, "argString_" + length, [ str ]));
            it("should reply string " + length, TEST_REPLY.bind(this, "replyString_" + length, str));
        });
    });

    describe("int", function() {
        function TEST_INT(val) {
            var arg = parseInt(val, /^-?0x/.test(val) ? 16 : 10);
            var name = val;
            if(arg < 0) name = name.replace(/^./g, "m");
            arg.should.be.instanceof(Number);

            it("should send int " + name, TEST_ARGS.bind(this, "argInt_" + name, [ arg ]));
            it("should reply int " + name, TEST_REPLY.bind(this, "replyInt_" + name, arg));
        }

        TEST_INT("0");
        TEST_INT("1");
        TEST_INT("47");
        TEST_INT("-16");
        TEST_INT("0x30");
        TEST_INT("0x7ff");
        TEST_INT("-17");
        TEST_INT("-0x800");
        TEST_INT("0x800");
        TEST_INT("0x3ffff");
        TEST_INT("-0x801");
        TEST_INT("-0x40000");
        TEST_INT("0x40000");
        TEST_INT("0x7fffffff");
        TEST_INT("-0x40001");
        TEST_INT("-0x80000000");
    });

    describe("long", function() {
        function TEST_LONG(name, low, high) {
            high = high || 0;
            var arg;
            if((low > 0x7fffffff || low < 0) && high === 0) {
                arg = Long.fromNumber(low);
            } else {
                arg = {
                    high: high & 0xffffffff,
                    low: low & 0xffffffff
                };
            }

            var val;
            if(arg.hasOwnProperty("high")) {
                val = new Long(arg.low, arg.high).toNumber();
            } else {
                val = arg.toNumber();
            }

            arg = { high: arg.high, low: arg.low, unsigned: arg.unsigned };
            it("should send long " + name, TEST_ARGS.bind(this, "argLong_" + name, [ arg ]));
            it("should reply long " + name, TEST_REPLY.bind(this, "replyLong_" + name, function(res) {
                val.should.be.eql(res);
            }));
        }

        TEST_LONG("0", 0);
        TEST_LONG("1", 1);
        TEST_LONG("15", 15);
        TEST_LONG("m8", -8);
        TEST_LONG("0x10", 0x10);
        TEST_LONG("0x7ff", 0x7ff);
        TEST_LONG("m9", -9);
        TEST_LONG("m0x800", -0x800);
        TEST_LONG("0x800", 0x800);
        TEST_LONG("0x3ffff", 0x3ffff);
        TEST_LONG("m0x801", -0x801);
        TEST_LONG("m0x40000", -0x40000);
        TEST_LONG("0x40000", 0x40000);
        TEST_LONG("0x7fffffff", 0x7fffffff);
        TEST_LONG("m0x40001", -0x40001);
        TEST_LONG("m0x80000000", -0x80000000);
        TEST_LONG("0x80000000", 0x80000000);
        TEST_LONG("m0x80000001", ~0x80000000, ~0x0); // 2-complement
    });

    describe("double", function() {
        function TEST_DOUBLE(val) {
            var name = val.toString().replace(/\./g, "_");
            if(val < 0) name = name.replace(/^./g, "m");

            it("should send double " + name, TEST_ARGS.bind(this, "argDouble_" + name, [{
                $class: "double",
                $: val
            }]));

            it("should reply double " + name, TEST_REPLY.bind(this, "replyDouble_" + name, function(res) {
                res.should.be.eql(val);
            }));
        }

        // TEST_DOUBLE(0.0);
        // TEST_DOUBLE(1.0);
        // TEST_DOUBLE(2.0);
        // TEST_DOUBLE(127.0);
        // TEST_DOUBLE(-128.0);
        // TEST_DOUBLE(128.0);
        // TEST_DOUBLE(-129.0);
        // TEST_DOUBLE(32767.0);
        // TEST_DOUBLE(-32768.0);
        TEST_DOUBLE(3.14159);
    });
});
