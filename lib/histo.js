const D3Node = require('d3-node');
const d3 = require('d3-v4')
const fs = require('fs');

// const species = require('../lib/species');
const styles = `
.bar rect {
  fill-opacity: 0;
  stroke:       black;
  stroke-width: 0.5;
}
.axis path,
.axis line {
  fill: none;
  stroke: #000;
  shape-rendering: crispEdges;
}
`;
const options = { svgStyles: styles, d3Module: d3 };
const margin = { top: 10, right: 30, bottom: 30, left: 30 },
    width = 860 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

function makeHistogram(abundances) {
  var d3n = new D3Node(options);
  var data = abundances.map(a => { return Math.log10(a) });

//IMPORTANT, domain.min must be > 0 for log scale to work!
  var x = d3.scaleLinear().range([0, width]).domain([Math.log10(0.01), Math.log10(1000000)]);

  var bins = d3.histogram()
    .domain(x.domain())
    .thresholds(d3.thresholdScott)
    (data);

  var y = d3.scaleLinear()
    .domain([
      0, d3.max(bins, function(d) {
        return d.length;
      })
    ])
    .range([height, 0]);

  var svg = d3n.createSVG()
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var bar = svg.selectAll(".bar")
    .data(bins)
    .enter().append("g")
    .attr("class", "bar")
    .attr("transform", function(d) {
      return "translate(" + x(d.x0) + "," + y(d.length) + ")";
    });

  bar.append("rect")
    .attr("x", 1)
    .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
    .attr("height", function(d) {
      return height - y(d.length);
    });

  var xAxis = d3.axisBottom(x).ticks(4)
    .tickFormat(function(d) {
      return Math.round(Math.pow(10, d));
    });

  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(y));
  return d3n;
}

if (typeof module !== 'undefined' && module.exports) { // Node.js
  module.exports = makeHistogram;
} else if (typeof define !== 'undefined' && define.amd) { // eslint-disable-line no-undef
  // AMD / RequireJS
  define([], function amddefinemod() { // eslint-disable-line no-undef, prefer-arrow-callback
    return makeHistogram;
  });
} else {  // included directly via <script> tag
  root.makeHistogram = makeHistogram;
}
