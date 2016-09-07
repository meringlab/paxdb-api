/**
 * Created by milans on 9/8/16.
 */

const PAYLOAD_VERSION = 15;
const PAXDB_URL = 'http://pax-db.org/';
const species = require('./lib/species');
const fs = require('fs');
const async = require('async');
const pg = require('pg');
const readline = require('readline');

const speciesIds = Object.keys(species);

// const connectionString = process.env.DATABASE_URL || 'postgres://postgres@eris.meringlab.org:8182/string_10_0';
const connectionString = process.env.DATABASE_URL || 'postgres://postgres@atlas.meringlab.org:5432/string_10_0';
const client = new pg.Client(connectionString);
client.connect();

function loadSpeciesInfo(callback) {
  console.log(`loading species info`);
  const sqlSpeciesInfo = `select species_id,official_name,compact_name from items.species where species_id in (${speciesIds.join(',')})`;
  const sqlNumProteins = `select species_id,count(protein_id) as c from items.proteins where species_id in (${speciesIds.join(',')}) group by species_id; `;
  const species = {};
  client.query(sqlSpeciesInfo).then(res => {
    res.rows.forEach(function(r) {
      species[r.species_id] = { id: r.species_id, name: r.official_name, compact_name: r.compact_name };
    });
    client.query(sqlNumProteins).then(npres => {
      npres.rows.forEach(function(r) {
        species[r.species_id]['num_proteins'] = parseInt(r.c);
      });
      console.log(`loading species info DONE`);
      callback(species);
    });
  });
}

function parseOrthgroups(contents, familySet) {
  contents.split('\n').forEach(function(line) {
    if (line.trim() == 0) {
      return
    }
    var rec = line.split('\t');
    //{"id": 9443, "name": "NOG21051", "clade": "PRIMATES", "members": [1803841, 1854701]},
    rec.slice(1, rec.length).forEach(function(el) {
      familySet.add(parseInt(el));
    });
  });
}

function loadProteins(cb) {
  console.log(`loading proteins`);
  console.log("loading orthgroups");
  const familySet = new Set();
  fs.readdirSync('./data/orthgroups').forEach(function(file) {
    parseOrthgroups(fs.readFileSync(`./data/orthgroups/${file}`, { 'encoding': 'utf8' }), familySet);
  });


  const speciesForProtein = {};
  const uniprotIdsMap = {};

  async.eachSeries(speciesIds, function(speciesId, callback) {
    console.log(`loading proteins for ${speciesId}`);
    const proteins = {};
    const sql = `select protein_id, protein_external_id, preferred_name, annotation ` +
      ` from items.proteins where species_id = ${speciesId}`;
    client.query(sql).then(res => {
      res.rows.forEach(function(r) {
        proteins[r.protein_id] = {
          id: r.protein_id,
          externalId: r.protein_external_id,
          name: r.preferred_name,
          hasFamily: familySet.has(r.protein_id),
          annotation: r.annotation
        };
        speciesForProtein[r.protein_id] = speciesId;
      });
      const uniprotSql = `SELECT protein_id, linkout_url FROM items.proteins_linkouts ` +
        ` WHERE  linkout_type='UniProt' AND protein_id in (select protein_id from items.proteins where species_id = ${speciesId})`;
      client.query(uniprotSql).then(res => {
        res.rows.forEach(function(r) {
          var ac = r.linkout_url.substring(1 + r.linkout_url.lastIndexOf("/"));
          const protein = proteins[r.protein_id];
          if (protein.uniprotId) {
            console.log('ERROR multiple uniprot ids, must to convert to an array');
            return;
          }
          protein.uniprotId = ac;
          uniprotIdsMap[ac] = r.protein_id;
        });

        // var writeStream = fs.createWriteStream(`./lib/proteins/${speciesId}.js`);
        // writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
        // writeStream.write("const proteins = ");
        // writeStream.write(JSON.stringify(proteins));
        // writeStream.write(';\n');
        // writeStream.write('module.exports = proteins;');
        // writeStream.end();

        console.log(`loading proteins for ${speciesId} DONE`);
        callback();
      });
    });
  }, function(err) {
    console.log(`loading proteins DONE`);
    if (err) throw err;
    cb(speciesForProtein, uniprotIdsMap);
  });
}


function loadDatasetInfo(cb) {
  console.log(`loading dataset info`);
  const datasets = {};
  const abundances_asc = {};
  const abundances_desc = {};
  const proteinsCovered = {}
  async.eachSeries(fs.readdirSync('./data/abundances'), function(d, callback) {
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
    rl.on('close', function() {

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
        var intId = parseInt(a.id, 10);
        desc.push(intId);
        asc.push(intId);
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

    rl.on('line', function(line) {
      if (!line.startsWith("#")) {
        var rec = line.split('\t');
        if (rec.length > 1) {
          if (!dataset.integrated) {
            proteinsCovered[species].add(rec[0]);
          }
          abundances[rec[0]] = parseFloat(rec[2]);
        }
        if (rec.length == 4) {
          peptideCounts[rec[0]] = parseInt(rec[3], 10);
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
  }, function(err) {
    console.log(`loading dataset info DONE`);
    if (err) throw err;
    speciesIds.forEach(function(id) {
      proteinsCovered[id] = proteinsCovered[id].size
    });

    cb(datasets, proteinsCovered, abundances_asc, abundances_desc);
  });
}

function loadGenomeSources(callback) {
  const input = fs.createReadStream('./data/eggnog4_genome_linkout.txt');
  const rl = readline.createInterface({ input })
  const sources = {}

  rl.on('close', function() {
    callback(sources);
  });

  rl.on('line', function(line) {
    const rec = line.split('\t');
    if (rec.length > 4) {
      sources[parseInt(rec[1])] = `<a href='${rec[4]}'>${rec[2]}</a>`;
    }
  });
}

function buildSpecies() {
  loadGenomeSources(function(sources) {

    loadSpeciesInfo(function(species) {
      for (var s in species) {
        species[s].genome_source = sources[s];
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
        console.log('done');
        client.on('drain', client.end.bind(client));
        client.end();
      });
    });
  });
}

function buildProteins() {

  loadProteins(function(proteins) {
    "use strict";
    var writeStream = fs.createWriteStream('./lib/proteins.js');
    writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
    writeStream.write("const proteins = ");
    writeStream.write(JSON.stringify(proteins));
    writeStream.write(';\n');
    writeStream.write('module.exports = proteins;');

    writeStream.end();
    console.log('done');
    client.on('drain', client.end.bind(client));
    client.end();

  });
}
function buildProteinsAsSeparateModules() {
  loadProteins(function(speciesForProtein, uniprotIdsMap) {
    var writeStream = fs.createWriteStream('./lib/proteins_index.js');
    writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
    writeStream.write("const speciesForProtein = ");
    writeStream.write(JSON.stringify(speciesForProtein));
    writeStream.write(';\n');
    writeStream.write(';\n');
    writeStream.write("const uniprotIdsMap = ");
    writeStream.write(JSON.stringify(uniprotIdsMap));
    writeStream.write(';\n');
    writeStream.write('module.exports.speciesForProtein = speciesForProtein;');
    writeStream.write('module.exports.uniprotIdsMap = uniprotIdsMap;');
    writeStream.end();
    console.log('done');
    client.on('drain', client.end.bind(client));
    client.end();
  });
}

function buildDatasets() {
  loadDatasetInfo(function(datasets, proteinsCovered, abundances_asc, abundances_desc) {
    const datasetsJson = {}
    const abundances = {};
    const peptideCounts = {};
    speciesIds.forEach(function(id) {
      datasets[parseInt(id)].forEach(function(d) {
        "use strict";
        abundances[d.id] = d.abundances;
        delete d.abundances;
        if (d.hasPeptideCounts) {
          peptideCounts[d.id] = d.peptideCounts;
          delete d.peptideCounts;
        }
        datasetsJson[d.id] = d;
      })
    });

    var writeStream = fs.createWriteStream('./lib/dataset_data.js');
    writeStream.write(`//FILE GENERATED BY build.js on ${new Date()}, DO NOT MODIFY!\n`);
    writeStream.write("const datasets = ");
    writeStream.write(JSON.stringify(datasetsJson));
    writeStream.write(';\n');
    writeStream.write(';\n');

    writeStream.write("const abundances = ");
    writeStream.write(JSON.stringify(abundances));
    writeStream.write(';\n');
    writeStream.write(';\n');

    writeStream.write("const abundances_asc = ");
    writeStream.write(JSON.stringify(abundances_asc));
    writeStream.write(';\n');
    writeStream.write(';\n');

    writeStream.write("const abundances_desc = ");
    writeStream.write(JSON.stringify(abundances_desc));
    writeStream.write(';\n');
    writeStream.write(';\n');

    writeStream.write("const peptideCounts = ");
    writeStream.write(JSON.stringify(peptideCounts));
    writeStream.write(';\n');
    writeStream.write(';\n');

    writeStream.write('module.exports.datasets = datasets;\n');
    writeStream.write('module.exports.abundances = abundances;\n');
    writeStream.write('module.exports.abundances_asc = abundances_asc;\n');
    writeStream.write('module.exports.abundances_desc = abundances_desc;\n');
    writeStream.write('module.exports.peptideCounts = peptideCounts;\n');
    writeStream.end();
    client.on('drain', client.end.bind(client));
    client.end();
  });
}

function buildDatasetsAsSeparateModules() {

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

        var writeStream = fs.createWriteStream(`./lib/dataset/${d.id}.js`);
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
      })
    });

    client.on('drain', client.end.bind(client));
    client.end();
  });
}


// buildSpecies();
// buildDatasets();
// buildDatasetsAsSeparateModules();
// buildProteins();
// buildProteinsAsSeparateModules();

/**
 * depends on dataset_data!
 */
function buildHistograms() {
  var makeHistogram = require('./lib/histo');
  //TODO list ./lib/dataset folder and load each module
  var glob = require("glob")

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
    })
  })
}

// buildHistograms();

function buildPayload() {
  const defaultDataset = require('./lib/speciesDefaultDataset');
  const datasetLib = require('./lib/dataset');
  const speciesRepo = require('./lib/species');

  // for (var speciesId = 882; speciesId == 882; speciesId = undefined) {
  for (var speciesId in speciesRepo) {
    console.log(`writing payload for ${speciesId}`);
    var species = speciesRepo[speciesId];
    var writeStream = fs.createWriteStream(`./public/payload/${species.id}-payload-v${PAYLOAD_VERSION}.json`);
    writeStream.write(`//FILE GENERATED on ${new Date()}, DO NOT MODIFY!\n`);
    writeStream.write(`{
      "nodes_file": "${PAXDB_URL}payload/${species.id}-payload-nodes-v${PAYLOAD_VERSION}.txt",
      "edges_file" : "",
      "logo_file"  : "${PAXDB_URL}public/images/paxdb_logo.png",
      "legend_file": "${PAXDB_URL}public/images/payload_legend.png",
      "name"       : "PaxDB"
    }`);
    writeStream.end(e=> {
      if (e) console.log(`error writing ${speciesId} payload: ${e.message}`); else console.log(`${speciesId} payload written`);
    });

    var d = defaultDataset(species.datasets);
    var dataset = require(`./lib/dataset/${d.id}.js`);
    var proteins = require(`./lib/proteins/${speciesId}.js`);
    const ranking = new datasetLib.Ranking(dataset.info.num_abundances);

    var writeStream = fs.createWriteStream(`./public/payload/${species.id}-payload-nodes-v${PAYLOAD_VERSION}.txt`);
    for (var proteinId in dataset.abundances) {
      //  3702.AT5G51880.1    #B95050 Abundance: 3.96 ppm, rank: 7077. out of 20185   http://archive.pax-db.org/v4.0/#!protein/3702.AT5G51880.1   http://archive.pax-db.org/v4.0/images/proteins_histograms/323_140812-small.png
      var abundance = dataset.abundances[proteinId];
      var hexColor = ranking.toRGB(abundance.r);
      writeStream.write(`${proteins[proteinId].externalId}\t${hexColor}\tAbundance: ${datasetLib.formattedAbundance(abundance.a)}, rank: ${ranking.formatRank(abundance.r)}\t`);
      writeStream.write(`${PAXDB_URL}protein/${proteinId}/${proteins[proteinId].name}\t`);
      writeStream.write(`${PAXDB_URL}dataset/${d.id}/histogram?hightlightProteinId=${proteinId}\n`);
    }
    writeStream.end(e=> {
      if (e) console.log(`error writing ${speciesId} payload nodes: ${e.message}`); else console.log(`${speciesId} payload nodes written`)
    });

  }
}
buildPayload();
