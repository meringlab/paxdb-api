/**
 * Created by milans on 31/08/2016.
 */

const fs = require('fs');
const makeHistogram = require('../lib/histo');
const scatter = require('../lib/scatter');
const cladogram = require('../lib/cladogram');

function sendHistogram(svgFile, datasetId, res, highlightProteinId) {
  fs.readFile(svgFile, { encoding: 'utf8' }, (err, data) => {
    if (err) {
      var dataset = require(`../lib/dataset/${datasetId}`);

      var abundancesMap = dataset.abundances; //map proteinId -> {a : , r: , ..}
      var abundances = [];
      for (var proteinId in abundancesMap) {
        var a = abundancesMap[proteinId].a;
        if (a >= 0.01) { //otherwise it cannot be plotted
          abundances.push(a);
        }
      }
      var highlightAbundance = undefined;
      if (highlightProteinId && highlightProteinId in abundancesMap) {
        highlightAbundance = abundancesMap[highlightProteinId].a;
      }
      var d3n = makeHistogram(abundances, highlightAbundance);
      res.header('content-type', 'image/svg+xml');
      res.end(d3n.svgString());

      if (err.code === 'ENOENT') {
        fs.writeFile(svgFile, d3n.svgString(), (err) => {
          if (err) log.error(`saving histogram for ${datasetId} - ${svgFile}: ${err.message}`);
        });
      }
    } else {
      res.header('content-type', 'image/svg+xml');
      res.end(data);
    }
  });
}

function sendScatter(svgFile, d1, d2, res) {
  fs.readFile(svgFile, { encoding: 'utf8' }, (err, data) => {
    if (err) {
      var dataset1 = require(`../lib/dataset/${d1}`);
      var dataset2 = require(`../lib/dataset/${d2}`);

      var s1 = dataset1.info.species_id;
      var s2 = dataset2.info.species_id;
      var nogs = cladogram.firstCommonAncestor(s1, s2).nogs;
      var a1 = dataset1.abundances; //map proteinId -> {a : , r: , ..}
      var a2 = dataset2.abundances; //map proteinId -> {a : , r: , ..}
      var data = scatter.correlate(a1, a2, nogs);
      var d3n = scatter.plot(data, dataset1.info.name, dataset2.info.name);
      res.header('content-type', 'image/svg+xml');
      res.end(d3n.svgString());

      if (err.code === 'ENOENT') {
        fs.writeFile(svgFile, d3n.svgString(), (err) => {
          if (err) log.error(`saving scatter for ${d1}/${d2} - ${svgFile}: ${err.message}`);
        });
      }
    } else {
      res.header('content-type', 'image/svg+xml');
      res.end(data);
    }
  });
}
module.exports.sendHistogram = sendHistogram;
module.exports.sendScatter = sendScatter;
