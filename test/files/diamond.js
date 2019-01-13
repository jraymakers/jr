module.exports = (jr) => ({
  a: { action: (j) => j.logger.log('a') },
  b: { needs: ['a'], action: (j) => j.logger.log('b') },
  c: { needs: ['a'], action: (j) => j.logger.log('c') },
  d: { needs: ['b', 'c'], action: (j) => j.logger.log('d') },
  e: { needs: ['b'], action: (j) => j.logger.log('e') }
});
