/**
 * Created by milans on 07/09/2016.
 */
function defaultDataset(datasets) {
  if (datasets.length === 1) {
    return datasets[0];
  }
  var candidate = datasets.find(e => { return e.integrated && e.organ == 'WHOLE_ORGANISM'} )
  if (candidate) {
    return candidate;
  }
  candidate = datasets.find(e => { return e.integrated} )
  if (candidate) {
    return candidate;
  }
  return datasets[0];
}

if (typeof module !== 'undefined' && module.exports) { // Node.js
  module.exports = defaultDataset;
} else if (typeof define !== 'undefined' && define.amd) { // eslint-disable-line no-undef
                                                          // AMD / RequireJS
  define([], function amddefinemod() { // eslint-disable-line no-undef, prefer-arrow-callback
    return defaultDataset;
  });
} else {  // included directly via <script> tag
  root.defaultDataset = defaultDataset;
}
