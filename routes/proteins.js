const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');

const speciesData = require('../lib/species');
const proteinData = require('../lib/proteins');
const datasetData = require('../lib/dataset_data');
const datasetLib = require('../lib/dataset');

const speciesForProtein = {}

for (var speciesId in proteinData) {
  for (var proteinId in proteinData[speciesId]) {
    speciesForProtein[proteinId] = speciesId;
  }
}

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

  var proteins = ids.map(function(id) {
    var protein = proteinData[speciesId][id];
    var rec = {id: protein.id, externalId: protein.externalId, name: protein.name};
    rec.abundances = speciesData[speciesId].datasets.map(function(datasetInfo) {
      const abundance = datasetData.abundances[datasetInfo.id][id];
      return datasetLib.formattedAbundance(abundance ? abundance.a : null);
    })
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
