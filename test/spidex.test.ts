import imageType from 'image-type';
import should from 'should';

import * as spidex from '../src';

describe('Spidex', () => {
  before(done => {
    spidex.setDefaultUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/39.0.2171.71 Safari/537.36');
    done();
  });

  describe('normal utf8 page', function() {
    this.timeout(0);

    it('should contain a certain sentence.', done => {
      spidex.get('https://www.upyun.com/', html => {
        html.indexOf('又拍云').should.not.equal(-1);
        done();
      }).on('error', err => {
        should.fail(0, 1, err.message);
        done();
      });
    });

    it('should be wrong username and password.', done => {
      spidex.post('http://acm.hdu.edu.cn/userloginex.php?action=login', {
        data: {
          username: 'fake!',
          password: 'fake!',
          login: 'Sign In',
        },
      }, (html, status) => {
        status.should.equal(200);
        html.indexOf('No such user or wrong password.').should.not.equal(-1);
        done();
      }).on('error', err => {
        should.fail(0, 1, err.message);
        done();
      });
    });
  });

  describe('other encoding page', function() {
    this.timeout(0);

    it('should contain "民间故事"', done => {
      spidex.get('https://www.6mj.com/', { charset: 'gb2312' }, html => {
        html.indexOf('民间故事').should.not.equal(-1);
        done();
      }).on('error', err => {
        should.fail(0, 1, err.message);
        done();
      });
    });

    it('should contain "文化資產"', done => {
      spidex.get('https://iht.nstm.gov.tw/', { charset: 'big5' }, html => {
        html.indexOf('文化資產').should.not.equal(-1);
        done();
      }).on('error', err => {
        should.fail(0, 1, err.message);
        done();
      });
    });
  });

  describe('binary file', function() {
    this.timeout(0);

    it('should be a JPEG file', done => {
      const url = 'https://raw.githubusercontent.com/XadillaX/hexo-site/' +
        'ad93217883a6e6ff1dd7136c6f3b732290e16d6d/public/images/background/1.jpeg';

      spidex.get(url, { charset: 'binary' }, buff => {
        should(imageType(buff)).eql({
          ext: 'jpg',
          mime: 'image/jpeg',
        });
        done();
      }).on('error', err => {
        should.fail(0, 1, err.message);
        done();
      });
    });
  });

  describe('timeout', function() {
    this.timeout(0);

    it('should request timeout.', done => {
      spidex.get('http://www.pccu.edu.tw/', {
        requestTimeout: 10,
        timeout: 10000,
      }, () => {
        should.fail(0, 1, 'This callback should not be called');
      }).on('error', err => {
        err.message.should.equal('Spidex request timeout in 10ms.');
        done();
      });
    });

    it('should response timeout.', done => {
      const url = 'https://raw.githubusercontent.com/XadillaX/hexo-site/' +
        'ad93217883a6e6ff1dd7136c6f3b732290e16d6d/public/images/background/1.jpeg';

      spidex.get(url, {
        charset: 'binary',
        responseTimeout: 10,
        timeout: 1000,
      }, () => {
        should.fail(0, 1, 'This callback should not be called');
      }).on('error', err => {
        err.message.should.equal('Spidex response timeout in 10ms.');
        done();
      });
    });

    it('should timeout.', done => {
      const url = 'https://raw.githubusercontent.com/XadillaX/hexo-site/' +
        '5c7b5b244bfc18c5ad6957144ee40cd3e0451d8e/public/images/header.jpeg';

      spidex.get(url, {
        charset: 'binary',
        responseTimeout: 1000,
        requestTimeout: 1000,
        timeout: 20,
      }, () => {
        should.fail(0, 1, 'This callback should not be called');
      }).on('error', err => {
        err.message.should.equal('Spidex timeout in 20ms.');
        done();
      });
    });

    it('shouldn\'t call timeout.', function(done) {
      let errorOccurred = 0;
      this.timeout(5000);

      spidex.get('http://zhaofulifxxkfxxkfxxkfxxk.org/', { timeout: 1000 }, () => {
        should.fail(0, 1, 'This callback should not be called');
      }).on('error', err => {
        should(err.message).not.equal('Spidex timeout in 1000ms.');
        errorOccurred = 1;
      });

      setTimeout(() => {
        should(errorOccurred).not.equal(0);
        done();
      }, 3000);
    });
  });

  describe('post', () => {
    it('should return whole data when POST utf8', done => {
      spidex.post('http://httpbin.org/post', {
        timeout: 60000,
        data: 'a=你好',
        charset: 'utf8',
      }, html => {
        const json = JSON.parse(html);
        should(json?.form?.a).equal('你好');
        done();
      }).on('error', err => {
        should.fail(0, 1, err.message);
      });
    });
  });

  describe('errors', () => {
    it('should occur an invalid protocol error.', done => {
      spidex.get('$$$$$', { timeout: 1 }, () => {
        should.fail(0, 1, 'This callback should not be called');
      }).on('error', err => {
        should(err.message.indexOf('Invalid URL')).not.equal(-1);
        done();
      });
    });
  });
});
