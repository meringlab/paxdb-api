const express = require('express');
const router = express.Router();
const bunyan = require('bunyan');

const speciesData = require('../lib/species');
const proteinData = require('../lib/proteins');
const datasetData = require('../lib/dataset');

const speciesForProtein = {}

for (var speciesId in proteinData) {
  for (var proteinId in proteinData[speciesId]) {
    speciesForProtein[proteinId] = speciesId;
  }
}

const log = bunyan.createLogger({
  name: "paxdb-API",
  module: "protein"
  //TODO server / host / process ..
});

router.param('protein_id', (req, res, next, proteinId) => {
  var id = parseInt(proteinId, 10);
  log.debug({ proteinId, id });

  //TODO support external ids!
  if (!(id in speciesForProtein)) {
    res.status(404);
    res.render('error', { message: `Unknown protein: ${proteinId}` });
    return;
  }

  req.protein_id = id;
  next();
});

function Ranking(max) {
  this.NO_RANK = "";
  this.max = max;
}

Ranking.prototype.absoluteRank = function absoluteRank(value) {
  if (!value || value < 0) {
    return this.NO_RANK;
  }
  return (value + 1) + ". out of " + this.max;
}

Ranking.prototype.relative = function relative(value) {
  if (value + 1 > this.max / 2.0) {
    return (value + 1.0) / this.max;
  }
  return value / this.max;
};
Ranking.prototype.formatRank = function formatRank(value) {
  const abs = this.absoluteRank(value);
  if (this.NO_RANK === abs) {
    return "--";
  }
  const relative = this.relativeRank(value);
  if (this.NO_RANK == relative) {
    return abs;
  }
  return abs + " [" + relative + "]";
}

Ranking.prototype.relativeRank = function relativeRank(value) {
  if (!value || value < 0) {
    return this.NO_RANK;
  }

  var relative = this.relative(value);

  if (relative <= 0.05) {
    return "top 5%";
  } else if (relative <= 0.10) {
    return "top 10%";
  } else if (relative <= 0.25) {
    return "top 25%";
  } else if (relative >= 0.95) {
    return "bottom 5%";
  } else if (relative >= 0.90) {
    return "bottom 10%";
  } else if (relative >= 0.75) {
    return "bottom 25%";
  }

  return this.NO_RANK;
};


//TODO refactor: move to dataset
function formattedAbundance(rawAbundance) {
  if (!rawAbundance) {
    return 'NA';
  }
  return valueToString(rawAbundance) + " ppm";
}
function valueToString(rawAbundance) {
  const forceFloat = parseFloat(rawAbundance)
  const rounded = +forceFloat.toFixed(2);

  if (rounded >= 100) {
    return Math.round(forceFloat);
  } else if (rounded >= 10) {
    return +forceFloat.toFixed(1)
  } else if (rounded >= 0.01) {
    return +forceFloat.toFixed(2)
  }
  return "< 0.01";
}

router.get('/:protein_id', (req, res) => {
  var speciesId = speciesForProtein[req.protein_id];
  const protein = proteinData[speciesId][req.protein_id];
  const abundances = speciesData[speciesId].datasets.map(function(datasetInfo) {
    var dataset = datasetData.abundances[datasetInfo.id];
    const abundance = dataset[req.protein_id];
    const ranking  = new Ranking(datasetData.datasets[datasetInfo.id].num_abundances);
    const a = {
      datasetInfo: datasetInfo,
      formattedAbundance: formattedAbundance(abundance? abundance.a : null),
      rank: ranking.formatRank(abundance? abundance.r : null)
    };
    return a;
  });
  const abundancesJson = JSON.stringify(abundances);
  res.header('content-type', 'application/json');
  res.render('protein', { protein: protein, abundances: abundancesJson });
});

module.exports = router;
//TODO
//exports = module.exports = function (options) {
//    return router
//}
