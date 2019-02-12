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

/**
 *
 * @param ncbiTaxon as string
 * @return {number}
 */
function parseSpecies(ncbiTaxon) {
    const id = parseInt(ncbiTaxon, 10);
    log.debug({ speciesId: ncbiTaxon, id });

    if (!(String(id) in species)) {
        throw new Error(`Unknown species: ${ncbiTaxon}`);
    }
    return id;
}

//TODO allow species names (and synonyms)
let checkSpeciesInputParameter = (req, res, next, speciesId) => {
    try {
        let id = parseSpecies(speciesId);
        next();
    } catch (e) {
        res.status(404);
        res.set('Content-type', 'application/json');
        res.render('error', { message: `Unknown species: ${speciesId}` });
        return;
    }
};
router.param('species_id', checkSpeciesInputParameter);
router.param('dst_species_id', checkSpeciesInputParameter);

router.get('/:species_id/correlate/:dst_species_id', (req, res) => {
    const d1 = defaultDataset(species[parseSpecies(req.params.species_id)].datasets).id;
    const d2 = defaultDataset(species[parseSpecies(req.params.dst_species_id)].datasets).id;
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
    res.json(species[req.species_id]);
});

module.exports = router;
