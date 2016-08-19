const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');

const species = require('../lib/species');
const dataset = require('../lib/dataset_data');
const proteins_data = require('../lib/proteins');
const proteinsByNameAsc = {};
const proteinsByNameDesc = {};
for (var datasetId in dataset.datasets) {
  var speciesId = dataset.datasets[datasetId].filename.split('-')[0];
  var proteins = proteins_data[speciesId];
  proteinsByNameAsc[datasetId]= Object.keys(dataset.abundances[datasetId]);
  proteinsByNameAsc[datasetId].sort(function(p1, p2) {
    if ( proteins[p1].name < proteins[p2].name )
      return -1;
    if ( proteins[p1].name > proteins[p2].name )
      return 1;
    return 0;
  });

  proteinsByNameDesc[datasetId] = Array.prototype.slice.call(proteinsByNameAsc[datasetId]);  //local copy
  proteinsByNameDesc[datasetId].reverse();
}

const log = bunyan.createLogger({
  name: "paxdb-API",
  module: "dataset"
  //TODO server / host / process ..
});

router.param('species_id', (req, res, next, speciesId) => {
  var id = parseInt(speciesId, 10);
  log.debug({ speciesId, id });

  if (!(String(id) in species)) {
    res.status(404);
    res.render('error', { message: `Unknown species: ${speciesId}` });
    return;
  }

  // once validation is done save the new item in the req
  req.species_id = String(id);
  next();

});

router.param('dataset_id', (req, res, next, datasetId) => {
  var id = parseInt(datasetId, 10);
  log.debug({ datasetId, id });

  if (!(id in dataset.datasets)) {
    res.status(404);
    res.render('error', { message: `Unknown dataset: ${datasetId}` });
    return;
  }

  // once validation is done save the new item in the req
  req.dataset_id = id;
  next();

});

router.get('/:species_id/:dataset_id', (req, res) => {
  res.header('content-type', 'application/json');
  res.end(JSON.stringify(dataset.datasets[req.dataset_id]));
});

router.get('/:species_id/:dataset_id/abundances', (req, res) => {
  //query options are start, end and sort
  const start = parseInt(req.query.start,10) || 0;
  const end = parseInt(req.query.end) || 10;
  //TODO check if datasetid is valid
  const abundances = dataset.abundances[req.dataset_id];
  var proteins = dataset.abundances_desc[req.dataset_id];
  if (req.query.sort === 'abundance') { //ascending, descending by default
    proteins = dataset.abundances_asc[req.dataset_id];
  } else if (req.query.sort === 'proteinName') {
    proteins =proteinsByNameAsc[req.dataset_id];
  }  else if (req.query.sort === '-proteinName') {
    proteins =proteinsByNameDesc[req.dataset_id];
  }
  const result = proteins.slice(start, end).map(id => {
    var proteinRec = proteins_data[req.species_id][id];
    return {
      id: id,
      abundance: abundances[id].a,
      rank: abundances[id].r,
      name: proteinRec.name,
      annotation: proteinRec.annotation
    }
  });
  res.header('content-type', 'application/json');
  res.end(JSON.stringify(result));
});


module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
