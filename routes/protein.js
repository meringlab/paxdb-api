/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const express = require('express');
const bunyan = require('bunyan');

const speciesData = require('../lib/species');
const datasetLib = require('../lib/dataset');
const proteinIndices = require('../lib/proteins_index');
const proteinIDMap = require('../lib/proteins_stringId_map');

const { speciesForProtein, uniprotIdsMap } = proteinIndices;
const { externalToInternalMap } = proteinIDMap;

const router = new express.Router();

const log = bunyan.createLogger({
    name: 'paxdb-API',
    module: 'protein'
    //TODO server / host / process ..
});

router.param('protein_id', (req, res, next, proteinId) => {
    const id = parseInt(proteinId, 10);
    log.debug({ proteinId, id });

    //TODO support external ids!
    if (!(id in speciesForProtein) || !speciesForProtein[id]) {
        res.status(404);
        res.set('Content-type', 'application/json');
        res.render('error', { message: `Unknown protein: ${proteinId}` });
        return;
    }

    req.protein_id = id;
    next();
});

function renderProtein(req, res) {
    const speciesId = speciesForProtein[req.protein_id];
    const protein = require(`../lib/proteins/${speciesId}`)[req.protein_id];
    const protein_name = req.protein_name;
    if (protein_name && protein_name !== protein.name) {
        res.status(404);    
    };
    const abundances = speciesData[speciesId].datasets.map((datasetInfo) => {
        const dataset = require(`../lib/dataset/${datasetInfo.id}`);
        const abundance = dataset.abundances[req.protein_id];
        const ranking = new datasetLib.Ranking(dataset.info.num_abundances);
        const a = {
            datasetInfo,
            formattedAbundance: datasetLib.formattedAbundance(abundance ? abundance.a : null),
            rank: ranking.formatRank(abundance ? abundance.r : null)
        };
        return a;
    });
    const abundancesJson = JSON.stringify(abundances);
    res.header('content-type', 'application/json');
    res.render('protein', { protein, abundances: abundancesJson });
}

router.get('/:protein_id', (req, res) => {
    renderProtein(req, res);
});

router.get('/uniprot/:ac', (req, res) => {
    if (req.params.ac in uniprotIdsMap) {
        req.protein_id = uniprotIdsMap[req.params.ac];
        renderProtein(req, res);
        return;
    }
    res.status(404);
    res.set('Content-type', 'application/json');
    res.render('error', { message: `no protein in paxdb has this uniprot ac ${req.params.ac}` });
});

router.get('/string/:ac', (req, res) => {
    if (req.params.ac in externalToInternalMap) {
        req.protein_id = externalToInternalMap[req.params.ac];
        renderProtein(req, res);
        return;
    }
    res.status(404);
    res.set('Content-type', 'application/json');
    res.render('error', { message: `no protein in paxdb has this string id ${req.params.ac}` });
});

router.get('/:protein_id/:protein_name', (req, res) => {
    renderProtein(req, res);
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
