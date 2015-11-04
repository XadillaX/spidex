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
});
