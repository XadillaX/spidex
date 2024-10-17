import Long from 'long';
import should from 'should';

import * as spidex from '../src';

const BASE_URL = 'http://hessian.caucho.com/test/test2';

describe('Hessian 2.0 test', function() {
  this.timeout(0);

  const TEST_REPLY = (method: string, reply: any, callback: () => void) => {
    spidex.hessianV2(BASE_URL, method, [], (err, result) => {
      should.ifError(err);
      if (typeof reply !== 'function') {
        should(result).be.eql(reply);
      } else {
        reply(result);
      }
      callback();
    });
  };

  const TEST_ARGS = (method: string, args: any[], callback: () => void) => {
    spidex.hessianV2(BASE_URL, method, args, (err, result) => {
      should.ifError(err);
      if (result !== true) console.log(result);
      should(result).be.eql(true);
      callback();
    });
  };

  describe('boolean | null', () => {
    it('should method null', done => {
      spidex.hessianV2(BASE_URL, 'methodNull', [], (err, result) => {
        should.ifError(err);
        should(result).be.null();
        done();
      });
    });

    it('should reply null', done => TEST_REPLY('replyNull', null, done));
    it('should reply true', done => TEST_REPLY('replyTrue', true, done));
    it('should reply false', done => TEST_REPLY('replyFalse', false, done));

    it('should send null', done => TEST_ARGS('argNull', [ null ], done));
    it('should send true', done => TEST_ARGS('argTrue', [ true ], done));
    it('should send false', done => TEST_ARGS('argFalse', [ false ], done));
  });

  describe('list', () => {
    [ 0, 1, 7, 8 ].forEach(len => {
      const list = Array.from({ length: len }, (_, i) => (i + 1).toString());

      it(`should send untyped list ${len}`, done => TEST_ARGS(`argUntypedFixedList_${len}`, [ list ], done));

      const _list = {
        $class: '[string',
        $: list.map(s => ({ $class: 'string', $: s })),
      };
      it(`should send typed list ${len}`, done => TEST_ARGS(`argTypedFixedList_${len}`, [ _list ], done));
    });
  });

  describe('map', () => {
    const maps = [
      {},
      { a: 0 },
      { 0: 'a', 1: 'b' },
      { a: 0 },
    ];

    const typedMaps: [ any, any, Map<number, string>, Map<any[], number> ] = [
      { $class: 'java.util.Hashtable', $: {} },
      { $class: 'java.util.Hashtable', $: { a: 0 } },
      new Map<number, string>(),
      new Map<any[], number>(),
    ];

    typedMaps[2].set(0, 'a');
    typedMaps[2].set(1, 'b');
    typedMaps[3].set([ 'a' ], 0);

    [ 0, 1, 2, 3 ].forEach(i => {
      it(`should reply typed map ${i}`, done => {
        TEST_REPLY(`replyTypedMap_${i}`, res => {
          should(res).be.eql(maps[i]);
        }, done);
      });

      it(`should reply untyped map ${i}`, done => {
        TEST_REPLY(`replyUntypedMap_${i}`, res => {
          should(res).be.eql(maps[i]);
        }, done);
      });

      it(`should send typed map ${i}`, done => TEST_ARGS(`argTypedMap_${i}`, [ typedMaps[i] ], done));
      it(`should send untyped map ${i}`, done => TEST_ARGS(`argUntypedMap_${i}`, [ typedMaps[i] ], done));
    });
  });

  describe('object', () => {
    it('should send object 0', done => TEST_ARGS('argObject_0', [
      { $class: 'com.caucho.hessian.test.A0', $: {} },
    ], done));

    it('should reply object 0', done => TEST_REPLY('replyObject_0', {}, done));

    const testClass = 'com.caucho.hessian.test.TestObject';
    it('should send object 1', done => TEST_ARGS('argObject_1', [
      { $class: testClass, $: { _value: 0 } },
    ], done));

    it('should reply object 1', done => TEST_REPLY('replyObject_1', { _value: 0 }, done));

    it('should send object 2', done => TEST_ARGS('argObject_2', [
      [{ $class: testClass, $: { _value: 0 } }, { $class: testClass, $: { _value: 1 } }],
    ], done));

    it('should send object 2a', done => TEST_ARGS('argObject_2a', [
      [{ $class: testClass, $: { _value: 0 } }, { $class: testClass, $: { _value: 0 } }],
    ], done));

    it('should send object 2b', done => TEST_ARGS('argObject_2b', [
      [{ $class: testClass, $: { _value: 0 } }, { $class: testClass, $: { _value: 0 } }],
    ], done));

    const obj3: any = { $class: 'com.caucho.hessian.test.TestCons', $: { _first: 'a', _rest: null } };
    obj3.$._rest = obj3;

    it('should send object 3', done => TEST_ARGS('argObject_3', [ obj3 ], done));
  });

  describe('date', () => {
    const dates = [
      new Date(0),
      new Date(Date.UTC(98, 4, 8, 9, 51, 31)),
      new Date(Date.UTC(98, 4, 8, 9, 51)),
    ];

    dates.forEach((date, i) => {
      it(`should send date ${i}`, done => TEST_ARGS(`argDate_${i}`, [ date ], done));
      it(`should reply date ${i}`, done => TEST_REPLY(`replyDate_${i}`, date, done));
    });
  });

  describe('binary', () => {
    const buf1023 = Buffer.from(
      Array.from({ length: 16 }, (_, i) =>
        `${Math.floor(i / 10)}${i % 10} 456789012345678901234567890123456789012345678901234567890123\n`,
      ).join('').substr(0, 1023),
    );

    [
      Buffer.alloc(0),
      Buffer.from('012345678901234'),
      Buffer.from('0123456789012345'),
      buf1023,
    ].forEach(arg => {
      const len = arg.length;
      it(`should send binary ${len}`, done => TEST_ARGS(`argBinary_${len}`, [ arg ], done));
    });
  });

  describe('string', () => {
    [ 0, 1, 31, 32, 1023, 1024, 65536 ].forEach(length => {
      let str: string;
      if (length <= 32) {
        str = '0123456789'.repeat(Math.ceil(length / 10)).substr(0, length);
      } else if (length <= 1024) {
        str = Array.from({ length: 16 }, (_, i) =>
          `${Math.floor(i / 10)}${i % 10} 456789012345678901234567890123456789012345678901234567890123\n`,
        ).join('').substr(0, length);
      } else {
        str = Array.from({ length: 64 * 16 }, (_, i) =>
          `${Math.floor(i / 100)}${Math.floor(i / 10) % 10}${i % 10} 56789012345678901234567890123456789012345678901234567890123\n`,
        ).join('').substr(0, length);
      }

      it(`should send string ${length}`, done => TEST_ARGS(`argString_${length}`, [ str ], done));
      it(`should reply string ${length}`, done => TEST_REPLY(`replyString_${length}`, str, done));
    });
  });

  describe('int', () => {
    const TEST_INT = (val: string) => {
      const arg = parseInt(val, /^-?0x/.test(val) ? 16 : 10);
      let name = val;
      if (arg < 0) name = name.replace(/^./, 'm');
      should(arg).be.instanceof(Number);

      it(`should send int ${name}`, done => TEST_ARGS(`argInt_${name}`, [ arg ], done));
      it(`should reply int ${name}`, done => TEST_REPLY(`replyInt_${name}`, arg, done));
    };

    TEST_INT('0');
    TEST_INT('1');
    TEST_INT('47');
    TEST_INT('-16');
    TEST_INT('0x30');
    TEST_INT('0x7ff');
    TEST_INT('-17');
    TEST_INT('-0x800');
    TEST_INT('0x800');
    TEST_INT('0x3ffff');
    TEST_INT('-0x801');
    TEST_INT('-0x40000');
    TEST_INT('0x40000');
    TEST_INT('0x7fffffff');
    TEST_INT('-0x40001');
    TEST_INT('-0x80000000');
  });

  describe('long', () => {
    const TEST_LONG = (name: string, low: number, high: number = 0) => {
      let arg: Long;
      if ((low > 0x7fffffff || low < 0) && high === 0) {
        arg = Long.fromNumber(low);
      } else {
        // eslint-disable-next-line no-bitwise
        arg = new Long(low & 0xffffffff, high & 0xffffffff);
      }

      const val = arg.toNumber();

      it(`should send long ${name}`, done => TEST_ARGS(`argLong_${name}`, [ arg ], done));
      it(`should reply long ${name}`, done => {
        TEST_REPLY(`replyLong_${name}`, res => {
          should(res).be.eql(val);
        }, done);
      });
    };

    TEST_LONG('0', 0);
    TEST_LONG('1', 1);
    TEST_LONG('15', 15);
    TEST_LONG('m8', -8);
    TEST_LONG('0x10', 0x10);
    TEST_LONG('0x7ff', 0x7ff);
    TEST_LONG('m9', -9);
    TEST_LONG('m0x800', -0x800);
    TEST_LONG('0x800', 0x800);
    TEST_LONG('0x3ffff', 0x3ffff);
    TEST_LONG('m0x801', -0x801);
    TEST_LONG('m0x40000', -0x40000);
    TEST_LONG('0x40000', 0x40000);
    TEST_LONG('0x7fffffff', 0x7fffffff);
    TEST_LONG('m0x40001', -0x40001);
    TEST_LONG('m0x80000000', -0x80000000);
    TEST_LONG('0x80000000', 0x80000000);
    // eslint-disable-next-line no-bitwise
    TEST_LONG('m0x80000001', ~0x80000000, ~0x0); // 2-complement
  });

  describe('double', () => {
    const TEST_DOUBLE = (val: number) => {
      let name = val.toString().replace(/\./g, '_');
      if (val < 0) name = name.replace(/^./, 'm');

      it(`should send double ${name}`, done => TEST_ARGS(`argDouble_${name}`, [{
        $class: 'double',
        $: val,
      }], done));

      it(`should reply double ${name}`, done => {
        TEST_REPLY(`replyDouble_${name}`, res => {
          should(res).be.eql(val);
        }, done);
      });
    };

    // Uncomment these tests if needed
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
