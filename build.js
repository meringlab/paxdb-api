/**
 * Created by milans on 9/8/16.
 */

const paxdb_data = require('./lib/paxdb_data');
const fs = require('fs');
const async = require('async');
const pg = require('pg');
const readline = require('readline');

const speciesIds = Object.keys(paxdb_data.species_full_names());

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

function loadDatasetInfo(cb) {
  console.log(`loading dataset info`);
  const datasets = {};
  const proteinsCovered = {}
  async.eachSeries(fs.readdirSync('./data/abundances'), function(d, callback) {
    const dataset = { filename: d};
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
      callback(null);
      dataset.abundances = abundances;
      if (Object.keys(peptideCounts).length === 0) {
        dataset.hasPeptideCounts = false;
      } else {
        dataset.hasPeptideCounts = true;
        dataset.peptideCounts = peptideCounts;
      }
    });

    rl.on('line', function(line) {
      if (!line.startsWith("#") && !dataset.integrated) {
        var rec = line.split('\t');
        if (rec.length > 1) {
          proteinsCovered[species].add(rec[0])
          abundances[rec[0]] = parseFloat(rec[2]);
        }
        if (rec.length == 4) {
          peptideCounts[rec[0]] = parseInt(rec[3],10);
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

    cb(datasets, proteinsCovered);
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
        s.genome_source = sources[s.id]
      }

      loadDatasetInfo(function(datasets, proteinsCovered) {
        for (var id in species) {
          var s = species[id];
          s.datasets = datasets[s.id];
          s.datasets.forEach(function(d){
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

buildSpecies();



