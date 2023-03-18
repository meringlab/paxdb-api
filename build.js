/**
 * Created by milans on 9/8/16.
 */

const PAYLOAD_VERSION = 23;
const uniprotMappingFile = './data/paxdb_uniprot_linkins_ids.tsv';
const PAXDB_URL = 'https://pax-db.org/';
const PAXDB_API_URL = 'https://api.pax-db.org/';
const fs = require('fs');
const async = require('async');
const pg = require('pg');
const readline = require('readline');

const speciesIds = [882,1148,3055,3702,4081,4577,4896,4932,5061,5691,5833,6239,7165,7227,7460,7955,8364,9031,9598,9606,9615,9796,9823,9913,10090,10116,39947,44689,64091,83332,85962,99287,122586,1280,1314,169963,192222,198214,208964,211586,214092,214684,224308,226186,243159,260799,189518,272623,272624,283166,353153,449447,511145,546414,593117,722438,73239,373153,224326,170187,5476,29760,246196,392499,284590,3708,67767,309800,7091,212042,6945,121845,8355,246200,547559,1286170,4113,7159,3847,4097,4565,8030,9544,4513,8022,3880,3218,272620,5811,9986,9685,65489,347256,89462,3635,9940,2711,160488,3827,100226,257313,1140,265311,589924,9612,657321,768679,522772,515619,263820,537011,55529,479436,10029,584708,5141,35128,411477,572546,667014,289377,1435377,610130,665571,187420,411460,272569,195103,1680,309799,5507,1114965,224325,79929,190304,190192,349741,273057,74426,2850,411470,410072,479437,273116,186497,2903,411479,469381,411902,273075,30732,269797,321967,523849,435591,411461,511051,1123384,880073,272559,1198114,435590,523841,243275,123214,709991,243232,243230,166486,243274];

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/paxdb';
const client = new pg.Client(connectionString);
client.connect();

function loadSpeciesInfo(callback) {
  console.log(`loading species info`);
  const sqlSpeciesInfo = `select species_id,official_name,compact_name from paxdb5_0.species where species_id in (${speciesIds.join(',')})`;
  const sqlNumProteins = `select species_id,count(protein_id) as c from paxdb5_0.proteins where species_id in (${speciesIds.join(',')}) group by species_id; `;
  const species = {};
  client.query(sqlSpeciesInfo).then(res => {
    res.rows.forEach(function (r) {
      species[r.species_id] = { id: r.species_id, name: r.official_name, compact_name: r.compact_name };
    });
    client.query(sqlNumProteins).then(npres => {
      npres.rows.forEach(function (r) {
        species[r.species_id]['num_proteins'] = parseInt(r.c);
      });
      console.log(`loading species info DONE`);
      callback(species);
    });
  });
}

function parseOrthgroups(contents, familySet) {
  contents.split('\n').forEach(function (line) {
    if (line.trim() == 0) {
      return
    }
    var rec = line.split('\t');
    //{"id": 9443, "name": "NOG21051", "clade": "PRIMATES", "members": [1803841, 1854701]},
    rec.slice(1, rec.length).forEach(function (el) {
      familySet.add(parseInt(el));
    });
  });
}

function loadUniprotMapping() {
  "use strict";
  console.log(`loadUniprotMapping from ${uniprotMappingFile}`);
  const paxdbUniprotIdMap = {};

  const uniprotLinkins = fs.readFileSync(uniprotMappingFile, 'utf-8');
  uniprotLinkins.split("\n").forEach((line) => {
    if (line) {
      let rec = line.trim().split('\t');
      paxdbUniprotIdMap[rec[0]] = rec[1];
    }
  });
  return paxdbUniprotIdMap;
}

function loadProteins(cb, createProteinModules = false) {
  console.log(`loading proteins`);
  console.log("loading orthgroups");
  const familySet = new Set();
  fs.readdirSync('./data/orthgroups').forEach(function (file) {
    parseOrthgroups(fs.readFileSync(`./data/orthgroups/${file}`, { 'encoding': 'utf8' }), familySet);
  });

  const paxdbUniprotIdsMap = loadUniprotMapping();
  const uniprotPaxdbIdsMap = {};
  // const speciesForProtein = {};
  // const externalToInternalMap = {};

  async.eachSeries(speciesIds, function (speciesId, callback) {
    console.log(`loading proteins for ${speciesId}`);
    const proteins = {};
    const sql = `select protein_id, protein_external_id, preferred_name, annotation ` +
      ` from paxdb5_0.proteins where species_id = ${speciesId}`;
    client.query(sql).then(res => {
      res.rows.forEach(function (r) {
        proteins[r.protein_external_id.split('.')[1]] = { // need protein name for abundance
          id: r.protein_id,
          externalId: r.protein_external_id,
          name: r.preferred_name,
          hasFamily: familySet.has(r.protein_id),
          annotation: r.annotation
        };
        if (Object.prototype.hasOwnProperty.call(paxdbUniprotIdsMap, r.protein_external_id)) {
          const ac = paxdbUniprotIdsMap[r.protein_external_id];
          proteins[r.protein_external_id.split('.')[1]].uniprotId = ac;
          // externalToInternalMap[r.protein_external_id] = r.protein_id
          if (!Object.prototype.hasOwnProperty.call(uniprotPaxdbIdsMap, ac)) {
            uniprotPaxdbIdsMap[ac] = r.protein_external_id;
          } else {
            let prev = uniprotPaxdbIdsMap[ac];
            if (!Array.isArray(prev)) {
              console.log(`multiple paxdb ids for ${ac}, must use an array`);
              uniprotPaxdbIdsMap[ac] = [prev];
            }
            uniprotPaxdbIdsMap[ac].push(r.protein_external_id);
          }
        }
        // speciesForProtein[r.protein_id] = speciesId;
      });
      console.log(`loading proteins for ${speciesId} DONE`);
      if (createProteinModules) {
        var writeStream = fs.createWriteStream(`./lib/proteins/${speciesId}.js`);
        writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
        writeStream.write("const proteins = ");
        writeStream.write(JSON.stringify(proteins));
        writeStream.write(';\n');
        writeStream.write('module.exports = proteins;');
        writeStream.end();
      }
      callback();
    });
  }, function (err) {
    console.log(`loading proteins DONE`);
    if (err) throw err;
    cb(uniprotPaxdbIdsMap); //speciesForProtein, externalToInternalMap
  });
}


function loadDatasetInfo(cb) {
  console.log(`loading dataset info`);
  const datasets = {};
  const abundances_asc = {};
  const abundances_desc = {};
  const proteinsCovered = {}
  async.eachSeries(fs.readdirSync('./data/abundances'), function (d, callback) {
    const dataset = {};
    const abundances = {};
    const peptideCounts = {};
    const species = parseInt(d.split('-')[0])
    if (!(species in datasets)) {
      datasets[species] = []
    }
    if (!(species in proteinsCovered)) {
      proteinsCovered[species] = new Set();
    }
    datasets[species].push(dataset);
    const input = fs.createReadStream(`./data/abundances/${d}`);
    const rl = readline.createInterface({ input })
    rl.on('close', function () {

      //add ranks
      var abundancesSorted = []
      for (var p in abundances) {
        abundancesSorted.push({ id: p, abundance: abundances[p] })
      }
      abundancesSorted = abundancesSorted.sort((a, b) => {
        return b.abundance - a.abundance
      });
      dataset.abundances = {};
      const asc = [];
      const desc = [];
      abundancesSorted.forEach((a, rank) => {
        dataset.abundances[a.id] = { a: a.abundance, r: rank }
        // var intId = parseInt(a.id, 10);
        desc.push(a.id);
        asc.push(a.id);
      });
      asc.reverse();
      abundances_asc[dataset.id] = asc;
      abundances_desc[dataset.id] = desc;

      dataset.num_abundances = abundancesSorted.length;
      if (Object.keys(peptideCounts).length === 0) {
        dataset.hasPeptideCounts = false;
      } else {
        dataset.hasPeptideCounts = true;
        dataset.peptideCounts = peptideCounts;
      }
      dataset.filename = d;

      callback(null);
    });

    rl.on('line', function (line) {
      if (!line.startsWith("#")) {
        var rec = line.split('\t');
        if (rec.length > 1) {
          if (!dataset.integrated) {
            proteinsCovered[species].add(rec[1].split('.')[1]); // need protein name for abundance
          }
          abundances[rec[1].split('.')[1]] = parseFloat(rec[2]); // need protein name for abundance
        }
        if (rec.length == 4) {
          peptideCounts[rec[1].split('.')[1]] = parseInt(rec[3], 10); // need protein name for abundance
        }
      } else {
        switch (line.split(':')[0].trim()) {
          case '#id':
            dataset.id = parseInt(line.split(':')[1].trim());
            break;
          case '#name':
            dataset.name = line.split(':')[1].trim();
            break;
          case '#score':
            dataset.score = parseFloat(line.split(':')[1].trim());
            break;
          case '#weight':
            dataset.weight = line.split(':')[1].trim();
            break;
          case '#description':
            dataset.description = line.replace(/#\W*description:\W*/, '').trim();
            break;
          case '#organ':
            dataset.organ = line.split(':')[1].trim();
            break;
          case '#integrated':
            dataset.integrated = line.split(':')[1].trim() === 'true';
            break;
          case '#coverage':
            dataset.coverage = parseFloat(line.split(':')[1].trim());
            break;
          case '#publication_year':
            dataset.publication_year = parseInt(line.split(':')[1].trim());
            break;
        }
      }
    })
  }, function (err) {
    console.log(`loading dataset info DONE`);
    if (err) throw err;
    speciesIds.forEach(function (id) {
      // console.log(id);
      proteinsCovered[id] = proteinsCovered[id].size
    });

    cb(datasets, proteinsCovered, abundances_asc, abundances_desc);
  });
}

function loadGenomeSources(callback) {
  const input = fs.createReadStream('./data/eggnog5_genome_linkout.txt');
  const rl = readline.createInterface({ input })
  const sources = {};
  const versions = {};

  rl.on('close', function () {
    callback(sources, versions);
  });

  rl.on('line', function (line) {
    const rec = line.split('\t');
    if (rec.length > 4) {
      sources[parseInt(rec[1])] = `<a href='${rec[4]}'>${rec[2]}</a>`;
      versions[parseInt(rec[1])] = rec[3];
    }
  });
}

function buildSpecies() {
  loadGenomeSources(function(sources, sourcesVersions) {

    loadSpeciesInfo(function(species) {
      for (var s in species) {
        species[s].genome_source = sources[s];
        species[s].genome_source_version = sourcesVersions[s];
      }

      loadDatasetInfo(function(datasets, proteinsCovered) {
        for (var id in species) {
          var s = species[id];
          s.datasets = datasets[s.id];
          s.datasets.forEach(function(d) {
            delete d.abundances;
            delete d.peptideCounts;
          });
          s.total_coverage = parseInt((100 * proteinsCovered[s.id]) / s.num_proteins, 10);
          if (s.datasets.length == 1) {
            s.average_coverage = s.datasets[0].coverage;
          } else {
            var numDatasets = 0;
            var sum = 0;
            s.datasets.forEach(function(d) {
              if (!d.integrated) {
                numDatasets++;
                sum += d.coverage;
              }
            });
            s.average_coverage = sum / numDatasets; //round?
          }
        }

        var writeStream = fs.createWriteStream('./lib/species.js');
        writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
        writeStream.write("const species = ");
        writeStream.write(JSON.stringify(species));
        writeStream.write(';\n');
        writeStream.write('module.exports = species;');

        writeStream.end();
        console.log('./lib/species.js generated');
        client.on('drain', client.end.bind(client));
        client.end();
      });
    });
  });
}

function buildProteins() {
  loadProteins(function(uniprotIdsMap) { //speciesForProtein, externalToInternalMap
    var writeStream = fs.createWriteStream('./lib/proteins_index.js');
    writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
    // writeStream.write("const speciesForProtein = ");
    // writeStream.write(JSON.stringify(speciesForProtein));
    // writeStream.write(';\n');
    // writeStream.write(';\n');
    writeStream.write("const uniprotIdsMap = ");
    writeStream.write(JSON.stringify(uniprotIdsMap));
    writeStream.write(';\n');
    // writeStream.write('module.exports.speciesForProtein = speciesForProtein;\n');
    writeStream.write('module.exports.uniprotIdsMap = uniprotIdsMap;\n');
    writeStream.end();
    console.log('./lib/proteins_index.js generated');

    // var writeStream = fs.createWriteStream('./lib/proteins_stringId_map.js');
    // writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
    // writeStream.write("const externalToInternalMap = ");
    // writeStream.write(JSON.stringify(externalToInternalMap));
    // writeStream.write(';\n');
    // writeStream.write('module.exports.externalToInternalMap = externalToInternalMap;\n');
    // writeStream.end();

    // console.log('./lib/proteins_stringId_map.js generated');
    // client.on('drain', client.end.bind(client));
    // client.end();
  }, true);
}

function buildDatasets() {

  loadDatasetInfo(function(datasets, proteinsCovered, abundances_asc, abundances_desc) {
    speciesIds.forEach(function(id) {
      datasets[parseInt(id)].forEach(function(d) {
        var abundances = d.abundances;
        var peptideCounts = d.peptideCounts;
        delete d.abundances;
        if (d.hasPeptideCounts) {
          delete d.peptideCounts;
        }
        d.species_id = parseInt(id);

        const generated = `./lib/dataset/${d.id}.js`;
        var writeStream = fs.createWriteStream(generated);
        writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
        writeStream.write("const info = ");
        writeStream.write(JSON.stringify(d));
        writeStream.write(';\n');
        writeStream.write(';\n');

        writeStream.write("const abundances = ");
        writeStream.write(JSON.stringify(abundances));
        writeStream.write(';\n');
        writeStream.write(';\n');

        writeStream.write("const abundances_asc = ");
        writeStream.write(JSON.stringify(abundances_asc[d.id]));
        writeStream.write(';\n');
        writeStream.write(';\n');

        writeStream.write("const abundances_desc = ");
        writeStream.write(JSON.stringify(abundances_desc[d.id]));
        writeStream.write(';\n');
        writeStream.write(';\n');
        writeStream.write("var peptideCounts;");
        writeStream.write(';\n');
        if (peptideCounts) {
          writeStream.write("peptideCounts =");
          writeStream.write(JSON.stringify(peptideCounts));
          writeStream.write(';\n');
          writeStream.write('\n');
        }

        writeStream.write('module.exports.info = info;\n');
        writeStream.write('module.exports.abundances = abundances;\n');
        writeStream.write('module.exports.abundances_asc = abundances_asc;\n');
        writeStream.write('module.exports.abundances_desc = abundances_desc;\n');
        writeStream.write('module.exports.peptideCounts = peptideCounts;\n');
        writeStream.end();
        console.log(`${generated} generated`);
      })
    });

    client.on('drain', client.end.bind(client));
    client.end();
  });
}



/**
 * depends on dataset_data!
 */
function buildHistograms() {
  var makeHistogram = require('./lib/histo');
  //TODO list ./lib/dataset folder and load each module
  var glob = require("glob");

  glob('./lib/dataset/*js', (er, files) => {
    files.forEach(f => {
      var dataset = require(f);
      var abundancesMap = dataset.abundances; //map proteinId -> {a : , r: , ..}
      var abundances = [];
      for (var proteinId in abundancesMap) {
        var a = abundancesMap[proteinId].a;
        if (a >= 0.01) { //otherwise it cannot be plotted
          abundances.push(a);
        }
      }
      var d3n = makeHistogram(abundances);
      fs.writeFile(`./public/images/datasets/${dataset.info.id}.svg`, d3n.svgString(), (err) => {
        if (err) console.log(`${dataset.info.id} failed: ${err.message}`);
      });
      var d3n = makeHistogram(abundances, undefined, true);
      fs.writeFile(`./public/images/datasets/${dataset.info.id}-thumb.svg`, d3n.svgString(), (err) => {
        if (err) console.log(`${dataset.info.id} failed: ${err.message}`);
      });
    });
  });
  console.log('histograms generated');

  client.on('drain', client.end.bind(client));
  client.end();
}


function buildPayload() {
  const defaultDataset = require('./lib/speciesDefaultDataset');
  const datasetLib = require('./lib/dataset');
  const speciesRepo = require('./lib/species');

  // for (var speciesId = 882; speciesId == 882; speciesId = undefined) {
  for (let speciesId in speciesRepo) {
    console.log(`writing payload for ${speciesId}`);
    const species = speciesRepo[speciesId];
    const payloadStream = fs.createWriteStream(`./public/payload/${species.id}-payload-v${PAYLOAD_VERSION}.json`);
    payloadStream.write(`{
      "nodes_file": "${PAXDB_URL}payload/${species.id}-payload-nodes-v${PAYLOAD_VERSION}.txt",
      "edges_file" : "",
      "logo_file"  : "${PAXDB_URL}images/paxdb_logo.png",
      "legend_file": "${PAXDB_URL}images/payload_legend.png",
      "name"       : "PaxDB"
    }`);
    payloadStream.end(e => {
      if (e) console.log(`error writing ${speciesId} payload: ${e.message}`); else console.log(`${speciesId} payload written`);
    });

    const d = defaultDataset(species.datasets);
    const dataset = require(`./lib/dataset/${d.id}.js`);
    const proteins = require(`./lib/proteins/${speciesId}.js`);
    const ranking = new datasetLib.Ranking(dataset.info.num_abundances);

    const nodesStream = fs.createWriteStream(`./public/payload/${species.id}-payload-nodes-v${PAYLOAD_VERSION}.txt`);
    Object.keys(dataset.abundances).forEach((proteinId) => {
      //  3702.AT5G51880.1    #B95050 Abundance: 3.96 ppm, rank: 7077. out of 20185   http://archive.pax-db.org/v4.0/#!protein/3702.AT5G51880.1   http://archive.pax-db.org/v4.0/images/proteins_histograms/323_140812-small.png
      const abundance = dataset.abundances[proteinId];
      const hexColor = ranking.toRGB(abundance.r);
      // console.log(proteinId);
      nodesStream.write(`${proteins[proteinId].externalId}\t${hexColor}\tAbundance: ${datasetLib.formattedAbundance(abundance.a)}, rank: ${ranking.formatRank(abundance.r)}\t`);
      nodesStream.write(`${PAXDB_API_URL}protein/${proteinId}/${proteins[proteinId].name}\t`);
      nodesStream.write(`${PAXDB_API_URL}dataset/${d.id}/histogram?hightlightProteinId=${proteinId}\n`);

    });

    nodesStream.end(e => {
      if (e) console.log(`error writing ${speciesId} payload nodes: ${e.message}`); else console.log(`${speciesId} payload nodes written`)
    });

  }
}

buildSpecies();
buildDatasets();
buildProteins();
// TODO FIXME writing streams is async, so lib/species.js won' show up before buildPayload is called
buildPayload();
buildHistograms();
