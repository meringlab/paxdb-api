const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');

const species = require('../lib/species');
const log = bunyan.createLogger({
    name: "paxdb-API",
    module: "species"
    //TODO server / host / process ..
});

//TODO allow species names (and synonyms
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

router.get('/:species_id', (req, res) => {
  res.header('content-type', 'application/json');
  res.end(JSON.stringify(species[req.species_id]));
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
