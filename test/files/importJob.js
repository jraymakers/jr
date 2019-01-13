module.exports = (jr) => ({
  importedJob: jr.import('fileToImport.js', 'jobToImport'),
  localJob: {
    needs: ['importedJob'],
    action: (j) => j.logger.log(`importJob.js localJob got this from importedJob: ${j.results.importedJob}`)
  }
});
