var expect = require('chai').expect;
var jr = require('../');

describe('jr', function () {
  
  describe('library', function () {
    
    function check(done, fn) {
      try {
        fn();
        done();
      } catch (err) {
        done(err);
      }
    }
    
    it('should produce no results when given no jobsNames', function (done) {
      jr.run({
        jobs: { }
      }, function (err, results) {
        check(done, function () {
          expect(!err).to.be.ok;
          expect(results).to.be.undefined;
        });
      });
    });
    
    it('should run a single job with no needs', function (done) {
      jr.run({
        jobNames: ['a'],
        jobs: {
          a: {
            action: function (cb) {
              cb(null, 'a results');
            }
          }
        }
      }, function (err, results) {
        check(done, function () {
          expect(!err).to.be.ok;
          expect(results).to.deep.equal({ a: 'a results' });
        });
      });
    });
    
    it('should run needed jobs', function (done) {
      jr.run({
        jobNames: ['b'],
        jobs: {
          a: {
            action: function (cb) {
              cb(null, 'a results');
            }
          },
          b: {
            needs: ['a'],
            action: function (cb) {
              cb(null, 'b results');
            }
          }
        }
      }, function (err, results) {
        check(done, function () {
          expect(!err).to.be.ok;
          expect(results).to.deep.equal({ a: 'a results', b: 'b results' });
        });
      });
    });
    
    it('should not run unneeded jobs', function (done) {
      jr.run({
        jobNames: ['b'],
        jobs: {
          a: {
            action: function (cb) {
              cb(null, 'a results');
            }
          },
          b: {
            action: function (cb) {
              cb(null, 'b results');
            }
          }
        }
      }, function (err, results) {
        check(done, function () {
          expect(!err).to.be.ok;
          expect(results).to.deep.equal({ b: 'b results' });
        });
      });
    });
    
    it('should run needed jobs once', function (done) {
      var aCount = 0;
      var bCount = 0;
      var cCount = 0;
      var dCount = 0;
      jr.run({
        jobNames: ['d'],
        jobs: {
          a: {
            action: function (cb) {
              aCount++;
              cb();
            }
          },
          b: {
            needs: ['a'],
            action: function (cb) {
              bCount++;
              cb();
            }
          },
          c: {
            needs: ['a'],
            action: function (cb) {
              cCount++;
              cb();
            }
          },
          d: {
            needs: ['b', 'c'],
            action: function (cb) {
              dCount++;
              cb();
            }
          }
        }
      }, function (err, results) {
        check(done, function () {
          expect(!err).to.be.ok;
          expect(aCount).to.equal(1);
          expect(bCount).to.equal(1);
          expect(cCount).to.equal(1);
          expect(dCount).to.equal(1);
        });
      });
    });
    
  });
  
});