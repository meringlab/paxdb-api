/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const express = require('express');
const bunyan = require('bunyan');

const speciesData = require('../lib/species');
const datasetLib = require('../lib/dataset');
const proteinIndices = require('../lib/proteins_index');

const router = new express.Router();
const { speciesForProtein } = proteinIndices;

const log = bunyan.createLogger({
  name: 'paxdb-API',
  module: 'proteins'
  //TODO server / host / process ..
});

router.get('/', (req, res) => {
  log.info({ query: req.query.ids });
  const ids = req.query.ids.split(',').map(i => parseInt(i, 10));
  for (let i = 0; i < ids.length; i += 1) {
    if (!(ids[i] in speciesForProtein)) {
      res.status(404);
      res.render('error', { message: `Unknown protein: ${ids[i]}` });
      return;
    }
  }
  const speciesId = speciesForProtein[ids[0]];//all belong to the same

  const proteinsMap = require(`../lib/proteins/${speciesId}`);
  const proteins = ids.map((id) => {
    const protein = proteinsMap[id];
    const rec = { id: protein.id, externalId: protein.externalId, name: protein.name };
    rec.abundances = speciesData[speciesId].datasets.map((datasetInfo) => {
      const dataset = require(`../lib/dataset/${datasetInfo.id}`);
      const abundance = dataset.abundances[id];
      return datasetLib.formattedAbundance(abundance ? abundance.a : null);
    });
    return rec;
  });
  const result = { speciesId, proteins, datasets: speciesData[speciesId].datasets };

  res.header('content-type', 'application/json');
  res.send(JSON.stringify(result));
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
