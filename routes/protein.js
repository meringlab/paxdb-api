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
  module: "protein"
  //TODO server / host / process ..
});

router.param('protein_id', (req, res, next, proteinId) => {
  var id = parseInt(proteinId, 10);
  log.debug({ proteinId, id });

  //TODO support external ids!
  if (!(id in speciesForProtein)) {
    res.status(404);
    res.render('error', { message: `Unknown protein: ${proteinId}` });
    return;
  }

  req.protein_id = id;
  next();
});


router.get('/:protein_id', (req, res) => {
  var speciesId = speciesForProtein[req.protein_id];
  const protein = proteinData[speciesId][req.protein_id];
  const abundances = speciesData[speciesId].datasets.map(function(datasetInfo) {
    var dataset = datasetData.abundances[datasetInfo.id];
    const abundance = dataset[req.protein_id];
    const ranking  = new datasetLib.Ranking(datasetData.datasets[datasetInfo.id].num_abundances);
    const a = {
      datasetInfo: datasetInfo,
      formattedAbundance: datasetLib.formattedAbundance(abundance? abundance.a : null),
      rank: ranking.formatRank(abundance? abundance.r : null)
    };
    return a;
  });
  const abundancesJson = JSON.stringify(abundances);
  res.header('content-type', 'application/json');
  res.render('protein', { protein: protein, abundances: abundancesJson });
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
