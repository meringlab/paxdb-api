const express = require('express');
const bunyan = require('bunyan');

const router = new express.Router();

const log = bunyan.createLogger({
    name: 'paxdb-API',
    module: 'dataset'
});

log.info('loading dataset module');

const plotter = require('./plotter');
const species = require('../lib/species');
//lazy init on access
const proteinsByNameAsc = {};
const proteinsByNameDesc = {};

router.param('species_id', (req, res, next, speciesId) => {
    const id = parseInt(speciesId, 10);
    log.debug({ speciesId, id });

    if (!(String(id) in species)) {
        res.status(404);
        res.set('Content-type', 'application/json');
        res.render('error', { message: `Unknown species: ${speciesId}` });
        return;
    }

    // once validation is done save the new item in the req
    req.species_id = String(id);
    next();
});

router.param('dataset_id', (req, res, next, datasetId) => {
    const id = parseInt(datasetId, 10);
    if (id != datasetId) { // eslint-disable-line eqeqeq
        res.status(404);
        res.set('Content-type', 'application/json');
        res.render('error', { message: `Unknown dataset: ${datasetId}` });
        return;
    }
    log.debug({ datasetId, id });
    let dataset;
    try {
    // eslint-disable-next-line
    dataset = require(`../lib/dataset/${id}`);
        if (req.species_id !== String(dataset.info.species_id)) {
            res.status(400);
            const suggestPath = req.originalUrl.replace(req.species_id, dataset.info.species_id);
            const suggestUrl = `${req.protocol}://${req.get('host')}${suggestPath}`;
            let message = `Dataset '${dataset.info.name}' does not belong to species ${req.species_id}`;
            message = `${message}, perhaps you wanted to ask for ${suggestUrl}`;
            res.set('Location', suggestUrl);
            res.set('Content-type', 'application/json');
            res.render('error', { message });
            return;
        }
    } catch (e) {
        res.status(404);
        res.set('Content-type', 'application/json');
        res.render('error', { message: `Unknown dataset: ${datasetId}` });
        return;
    }
    // once validation is done save the new item in the req
    req.dataset_id = id.toString();
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
    const proteinId = req.query.hightlightProteinId;
    let svgFile = `./public/images/datasets/${req.dataset_id}`;
    let thumb = false;
    if ('thumb' in req.query) {
        svgFile = `${svgFile}-thumb.svg`;
        thumb = true;
    } else {
        svgFile = `${svgFile}${proteinId ? `_${proteinId}` : ''}.svg`;
    }
    plotter.sendHistogram(svgFile, req.dataset_id, res, proteinId, thumb);
});

router.get('/:species_id/:dataset_id', (req, res) => {
    // res.header('content-type', 'application/json');
    // res.end(JSON.stringify(req.dataset.info));
    res.json(req.dataset.info);
});

function getProteinsSortedByName(dataset, asc /* true by default*/) {
// eslint-disable-next-line no-param-reassign
    asc = undefined === asc ? true : asc;
    const map = asc ? proteinsByNameAsc : proteinsByNameDesc;
    //lazy init
    const datasetId = dataset.info.id;
    if (!(datasetId in map)) {
    // eslint-disable-next-line
    const proteins = require(`../lib/proteins/${dataset.info.species_id}.js`);
        proteinsByNameAsc[datasetId] = Object.keys(dataset.abundances);
        proteinsByNameAsc[datasetId].sort((p1, p2) => {
            if (proteins[p1].name < proteins[p2].name) {
                return -1;
            }
            if (proteins[p1].name > proteins[p2].name) {
                return 1;
            }
            return 0;
        });
        //local copy:
        proteinsByNameDesc[datasetId] = Array.prototype.slice.call(proteinsByNameAsc[datasetId]);
        proteinsByNameDesc[datasetId].reverse();
    }
    return map[datasetId];
}

router.get('/:species_id/:dataset_id/abundances', (req, res) => {
    //query options are start, end and sort
    const start = parseInt(req.query.start, 10) || 0;
    const end = parseInt(req.query.end, 10) || 10;

    const { abundances } = req.dataset;
    let proteins = req.dataset.abundances_desc;
    if (req.query.sort === 'abundance') { //ascending, descending by default
        proteins = req.dataset.abundances_asc;
    } else if (req.query.sort === 'proteinName') {
        proteins = getProteinsSortedByName(req.dataset);
    } else if (req.query.sort === '-proteinName') {
        proteins = getProteinsSortedByName(req.dataset, false);
    }
    // eslint-disable-next-line
  const proteinsData = require(`../lib/proteins/${[req.species_id]}.js`);
    const result = proteins.slice(start, end)
        .map((id) => {
            const proteinRec = proteinsData[id];
            return {
                id,
                abundance: abundances[id].a,
                rank: abundances[id].r,
                name: proteinRec.name,
                annotation: proteinRec.annotation
            };
        });
    // res.header('content-type', 'application/json');
    // res.end(JSON.stringify(result));
    res.json(result);
});

log.info('loading dataset module COMPLETE');

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
