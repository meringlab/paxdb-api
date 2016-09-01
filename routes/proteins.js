const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');

const speciesData = require('../lib/species');
const datasetLib = require('../lib/dataset');

const proteinIndices = require('../lib/proteins_index')
const speciesForProtein = proteinIndices.speciesForProtein;

const log = bunyan.createLogger({
  name: "paxdb-API",
  module: "proteins"
  //TODO server / host / process ..
});

router.get('/', (req, res) => {
  var ids = req.query.ids.split(',').map(i => {return parseInt(i, 10)});
  for (var i = 0; i < ids.length; i++) {
    if (!(ids[i] in speciesForProtein)) {
      res.status(404);
      res.render('error', { message: `Unknown protein: ${id}` });
      return;
    }
  }
  var speciesId = speciesForProtein[ids[0]];//all belong to the same

  var proteinsMap = require(`../lib/proteins/${speciesId}`);
  var proteins = ids.map(function(id) {
    var protein = proteinsMap[id];
    var rec = {id: protein.id, externalId: protein.externalId, name: protein.name};
    rec.abundances = speciesData[speciesId].datasets.map(function(datasetInfo) {
      var dataset = require(`../lib/dataset/${datasetInfo.id}`);
      const abundance = dataset.abundances[id];
      return datasetLib.formattedAbundance(abundance ? abundance.a : null);
    });
    return rec;
  });
  const result = { speciesId, proteins, datasets: speciesData[speciesId].datasets };

  res.header('content-type', 'application/json');
  res.send(JSON.stringify(result))
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
