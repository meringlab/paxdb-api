/**
 * Created by milans on 13/08/2016.
 */

(function iiv() {
  function Ranking(max) {
    this.NO_RANK = "";
    this.max = max;
  }

  Ranking.prototype.absoluteRank = function absoluteRank(value) {
    if (value < 0) {
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
    if (value < 0) {
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

  if (typeof module !== 'undefined' && module.exports) { // Node.js
    module.exports.Ranking = Ranking;
    module.exports.formattedAbundance = formattedAbundance;
  } else if (typeof define !== 'undefined' && define.amd) { // eslint-disable-line no-undef
    // AMD / RequireJS
    define([], function amddefinemod() { // eslint-disable-line no-undef, prefer-arrow-callback
      return Ranking;
    });
  } else {  // included directly via <script> tag
    root.Ranking = Ranking;
  }
}());
