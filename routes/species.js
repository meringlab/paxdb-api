const express = require('express');
const bunyan = require('bunyan');
const plotter = require('./plotter');
const species = require('../lib/species');
const defaultDataset = require('../lib/speciesDefaultDataset');

const router = new express.Router();
const log = bunyan.createLogger({
  name: 'paxdb-API',
  module: 'species'
  //TODO server / host / process ..
});

//TODO allow species names (and synonyms
router.param('species_id', (req, res, next, speciesId) => {
  const id = parseInt(speciesId, 10);
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

router.get('/:species_id/correlate/:dst_species_id', (req, res) => {
  const d1 = defaultDataset(species[req.species_id].datasets).id;
  const d2 = defaultDataset(species[req.params.dst_species_id].datasets).id;
  //can't figure out how to forward:
  // req.url = `/dataset/${d1}/correlate/${d2}`;
  // req.params['dataset'] = d1;
  // req.params['dst_dataset_id'] = d2;
  // next();
  const minId = Math.min(d1, d2);
  const maxId = Math.max(d1, d2);
  const svgFile = `./public/images/scatter/${minId}_${maxId}.svg`;
  plotter.sendScatter(svgFile, minId, maxId, res);
});

router.get('/:species_id', (req, res) => {
  res.header('content-type', 'application/json');
  res.end(JSON.stringify(species[req.species_id]));
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
