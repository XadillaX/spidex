/**
 * XadillaX created at 2015-11-04 10:31:13 With ♥
 *
 * Copyright (c) 2015 Souche.com, all rights
 * reserved.
 */
"use strict";

require("es6-map-shim");
var should = require("should");

var spidex = require("../");

describe("Hessian 2.0 test", function() {
    var BASE_URL = "http://hessian.caucho.com/test/test2";

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
});
