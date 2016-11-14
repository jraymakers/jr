const jr = require('../../');

const jobs = {
  numbers: {
    action: () => ({
      x: 3,
      y: 5
    })
  },
  calculateSum: {
    needs: ['numbers'],
    action: (j) => j.results.numbers.x + j.results.numbers.y
  },
  calculateProduct: {
    needs: ['numbers'],
    action: (j) => j.results.numbers.x * j.results.numbers.y
  },
  displaySum: {
    needs: ['calculateSum'],
    action: (j) => {
      j.logger.log(j.results.calculateSum);
    }
  },
  displayProduct: {
    needs: ['calculateProduct'],
    action: (j) => {
      j.logger.log(j.results.calculateProduct);
    }
  },
  displayAll: {
    needs: ['displaySum', 'displayProduct']
  }
};

jr.runJobs(jobs, ['displayAll'])
  .then(() => {
    console.log('success!');
  })
  .catch((err) => {
    console.log(err);
  });
