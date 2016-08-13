const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');

const species = require('../lib/species');
const dataset = require('../lib/dataset_data');

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

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
