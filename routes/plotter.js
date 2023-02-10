/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

const fs = require('fs');
const bunyan = require('bunyan');
const makeHistogram = require('../lib/histo');
const scatter = require('../lib/scatter');
// const cladogram = require('../lib/cladogram');

const log = bunyan.createLogger({
    name: 'paxdb-API',
    module: 'plotter'
    //TODO server / host / process ..
});


function sendHistogram(svgFile, dataset, res, highlightProteinId, thumb) {
    fs.readFile(svgFile, { encoding: 'utf8' }, (err, data) => {
        if (err) {
            log.info(`creating histogram ${svgFile}`);

            const abundancesMap = dataset.abundances; //map proteinId -> {a : , r: , ..}
            const abundances = [];
            // for (var proteinId in abundancesMap) {
            Object.keys(abundancesMap)
                .forEach((proteinId) => {
                    const { a } = abundancesMap[proteinId];
                    if (a >= 0.01) { //otherwise it cannot be plotted
                        abundances.push(a);
                    }
                });
            let highlightAbundance;
            if (highlightProteinId && highlightProteinId in abundancesMap) {
                highlightAbundance = abundancesMap[highlightProteinId].a;
            }
            const d3n = makeHistogram(abundances, highlightAbundance, thumb);
            res.header('content-type', 'image/svg+xml');
            res.end(d3n.svgString());

            if (err.code === 'ENOENT') {
                fs.writeFile(svgFile, d3n.svgString(), (err2) => {
                    if (err2) log.error(`saving histogram for ${dataset.info.id} - ${svgFile}: ${err2.message}`);
                });
            } else {
                log.error(`failed to read histogram file ${svgFile}: ${err.message}`);
            }
        } else {
            res.header('content-type', 'image/svg+xml');
            res.end(data);
        }
    });
}

// function sendScatter(svgFile, d1, d2, res) {
//     fs.readFile(svgFile, { encoding: 'utf8' }, (err, svgFileContents) => {
//         if (err) {
//             log.info(`creating scatter ${svgFile}`);

//             const dataset1 = require(`../lib/dataset/${d1}`);
//             const dataset2 = require(`../lib/dataset/${d2}`);

//             const s1 = dataset1.info.species_id;
//             const s2 = dataset2.info.species_id;
//             const { nogs } = cladogram.firstCommonAncestor(s1, s2);
//             const a1 = dataset1.abundances; //map proteinId -> {a : , r: , ..}
//             const a2 = dataset2.abundances; //map proteinId -> {a : , r: , ..}
//             const data = scatter.correlate(a1, a2, nogs);
//             const d3n = scatter.plot(data, dataset1.info.name, dataset2.info.name);

//             if (res) {
//                 res.header('content-type', 'image/svg+xml');
//                 res.end(d3n.svgString());
//             }

//             if (err.code === 'ENOENT') {
//                 fs.writeFile(svgFile, d3n.svgString(), (err2) => {
//                     if (err2) log.error(`saving scatter for ${d1}/${d2} - ${svgFile}: ${err2.message}`);
//                 });
//             } else {
//                 log.error(`failed to read scatter file ${svgFile}: ${err.message}`);
//             }
//         } else if (res) {
//             res.header('content-type', 'image/svg+xml');
//             res.end(svgFileContents);
//         } else {
//             res.status(500)
//                 .json({ message: 'failed to create scatter' });
//         }
//     });
// }
module.exports.sendHistogram = sendHistogram;
// module.exports.sendScatter = sendScatter;

// var glob = require("glob")
//
// glob('./lib/dataset/*js', (er, files) => {
//   for (let i = 0; i < files.length - 1; i++) {
//     let d1 = files[i].replace('./lib/dataset/', '').split('.')[0];
//     for (let j = i + 1; j < files.length; j++) {
//       let d2 = files[j].replace('./lib/dataset/', '').split('.')[0];
//       let svgFile = `./public/images/scatter/${d1}_${d2}.svg`;
//       try {
//         sendScatter(svgFile, d1, d2);
//       } catch (err) {
//         console.log(`failed to correlate ${d1} and ${d2}: ${err}`);
//       }
//     }
//   }
// });
