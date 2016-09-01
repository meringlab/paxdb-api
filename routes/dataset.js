const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');
const fs = require('fs');

const log = bunyan.createLogger({
  name: "paxdb-API",
  module: "dataset"
  //TODO server / host / process ..
});

log.info('loading dataset module');

const plotter = require('./plotter')
const cladogram = require('../lib/cladogram')
const species = require('../lib/species');
const proteins_data = require('../lib/proteins');
//lazy init on access
const proteinsByNameAsc = {};
const proteinsByNameDesc = {};

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
  var dataset;
  try {
    dataset = require(`../lib/dataset/${id}`);
  } catch(e) {
    res.status(404);
    res.render('error', { message: `Unknown dataset: ${datasetId}` });
    return;
  }
  // once validation is done save the new item in the req
  req.dataset_id = datasetId;
  //TODO cache this
  req.dataset = dataset;
  next();

});

router.get('/:dataset_id/correlate/:dst_dataset_id', (req, res) => {
  const minId = Math.min(req.dataset.info.id, parseInt(req.params.dst_dataset_id, 10));
  const maxId = Math.max(req.dataset.info.id, parseInt(req.params.dst_dataset_id, 10));
  const svgFile = `./public/images/scatter/${minId}_${maxId}.svg`;
  plotter.sendScatter(svgFile, minId, maxId, res);
});

router.get('/:dataset_id/histogram', (req, res) => {
  var proteinId = req.query.hightlightProteinId;
  const svgFile = `./public/images/datasets/${req.dataset_id}` + (proteinId ? `_${proteinId}` : '') + '.svg';
  plotter.sendHistogram(svgFile, req.dataset_id, res, proteinId);
});

router.get('/:species_id/:dataset_id', (req, res) => {
  res.header('content-type', 'application/json');
  res.end(JSON.stringify(req.dataset.info));
});

function getProteinsSortedByName(dataset, asc /* true by default*/) {
  asc = undefined === asc ? true : asc;
  var map = asc ? proteinsByNameAsc : proteinsByNameDesc;
    //lazy init
  var datasetId = dataset.info.id;
  if (!(datasetId in map)) {
    var speciesId = dataset.info.species_id;
    var proteins = proteins_data[speciesId];
    proteinsByNameAsc[datasetId] = Object.keys(dataset.abundances);
    proteinsByNameAsc[datasetId].sort(function(p1, p2) {
      if (proteins[p1].name < proteins[p2].name)
        return -1;
      if (proteins[p1].name > proteins[p2].name)
        return 1;
      return 0;
    });

    proteinsByNameDesc[datasetId] = Array.prototype.slice.call(proteinsByNameAsc[datasetId]);  //local copy
    proteinsByNameDesc[datasetId].reverse();
  }
  return map[datasetId];
}

router.get('/:species_id/:dataset_id/abundances', (req, res) => {
  //query options are start, end and sort
  const start = parseInt(req.query.start, 10) || 0;
  const end = parseInt(req.query.end) || 10;
  var datasetId = req.dataset_id;

  const abundances = req.dataset.abundances;
  var proteins = req.dataset.abundances_desc;
  if (req.query.sort === 'abundance') { //ascending, descending by default
    proteins = req.dataset.abundances_asc;
  } else if (req.query.sort === 'proteinName') {
    proteins = getProteinsSortedByName(req.dataset);
  } else if (req.query.sort === '-proteinName') {
    proteins = getProteinsSortedByName(req.dataset, false);
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

log.info('loading dataset module COMPLETE');

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
