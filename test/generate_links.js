/*
  this script generates all links for proteins and species.
  used it for running http benchmarks.
 */
const species = require('../lib/species');
const ids = Object.keys(species);

for (let id of ids) {
  console.log(`/species/${id}\0`);
}

for (let speciesId of ids) {
  let datasets = species[speciesId].datasets;
  for (let d of datasets) {
    console.log(`/dataset/${speciesId}/${d.id}\0`);
  }
}

for (let speciesId of ids) {
  let proteins = require(`../lib/proteins/${speciesId}`);
  for (let id of Object.keys(proteins)) {
    console.log(`/protein/${id}\0`);
  }
}

