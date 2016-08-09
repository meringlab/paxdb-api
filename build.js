/**
 * Created by milans on 9/8/16.
 */

const paxdb_data = require('./lib/paxdb_data');
const config = require('./lib/config');
// const http = require('http');
const fs = require('fs');
const async = require('async');
const pg = require('pg');
const readline = require('readline');

const speciesIds = Object.keys(paxdb_data.species_full_names());

const connectionString = process.env.DATABASE_URL || 'postgres://postgres@eris.meringlab.org:8182/string_10_0';
const client = new pg.Client(connectionString);
client.connect();

function loadSpeciesInfo(callback) {
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
      callback(species);
    });
  });
}


function loadDatasetInfo(cb) {
  const datasets = {};

  async.eachSeries(fs.readdirSync('./data/abundances'), function(d, callback) {
    console.log(`reading ${d}`);
    const dataset = { filename: d }
    const species = parseInt(d.split('-')[0])
    if (!(species in datasets)) {
      datasets[species] = []
    }
    datasets[species].push(dataset);
    const input = fs.createReadStream(`./data/abundances/${d}`);
    const rl = readline.createInterface({ input })
    rl.on('close', function() {
      callback(null);
    });

    rl.on('line', function(line) {
      if (!line.startsWith("#")) {
        rl.close();
        return;
      }
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
    })
  }, function(err) {
    if (err) throw err;
    cb(datasets);
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

// loadSpeciesInfo(function(s) {
//   console.log(s);
// });

//
// loadDatasetInfo(function(s) {
//   console.log(s[882]);
// });

// loadGenomeSources(function(s) {
//   console.log(s[882]);
// });

// var writeStream = fs.createWriteStream('./lib/species.js');
//
// writeStream.write("const species = [");
//
// writeStream.write("];");
// writeStream.write("module.exports = species;");
//
// writeStream.end();


