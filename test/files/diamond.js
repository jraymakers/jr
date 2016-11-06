module.exports = (jr) => ({
  a: { action: (res, log) => log('a') },
  b: { needs: ['a'], action: (res, log) => log('b') },
  c: { needs: ['a'], action: (res, log) => log('c') },
  d: { needs: ['b', 'c'], action: (res, log) => log('d') },
  e: { needs: ['b'], action: (res, log) => log('e') }
});
