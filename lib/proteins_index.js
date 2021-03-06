const bunyan = require('bunyan');

const log = bunyan.createLogger({
    name: 'paxdb-API',
    module: 'proteins-index'
});
log.info('loading proteins index');
const speciesForProtein = require('./generated/protein-species.json');
const uniprotIdsMap = require('./generated/protein-uniprotid.json');
log.info('loading proteins index DONE');
module.exports.speciesForProtein = speciesForProtein;
module.exports.uniprotIdsMap = uniprotIdsMap;
