module.exports = (jr) => ({
  localJob: {
    action: () => ({ data: 'Data from fileToImport.js localJob.' })
  },
  jobToImport: {
    action: (j) => j.results.localJob.answer + ' With additions from fileToImport.js jobToImport.'
  }
});
