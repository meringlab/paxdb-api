const { expect, assert } = require('chai');
const should = require('should');
const datasetLib = require('../lib/dataset');
const scatter = require('../lib/scatter');

describe("Ranking", function() {
    const ranking = new datasetLib.Ranking(100);

    describe("relative ranking", function () {
        it('should handle top 5/10/25%', function () {
            [0,1,2,3,4,5].forEach(val => expect(ranking.relativeRank(val)).to.be.eql('top 5%', val));
            [6,7,8,9,10].forEach(val => expect(ranking.relativeRank(val)).to.be.eql('top 10%', val));
            [11,12,20,23,24,25].forEach(val => expect(ranking.relativeRank(val)).to.be.eql('top 25%', val));
        });
        it('should handle bottom 5/10/25%', function () {
            [0,1,2,3,4,5].forEach(val => expect(ranking.relativeRank(100-val)).to.be.eql('bottom 5%',100-val));
            [6,7,8,9,10].forEach(val => expect(ranking.relativeRank(100-val)).to.be.eql('bottom 10%',100-val));
            [11,12,20,23,24,25].forEach(val => expect(ranking.relativeRank(100-val)).to.be.eql('bottom 25%',100-val));
        });
        it('should be empty for anything between top and bottom', function () {
            [26,27, 40, 50, 60, 70, 73, 74].forEach(val => expect(ranking.relativeRank(val)).to.be.eql('',val));
        });
        it('should handle missing abundances', function() {
            ranking.relativeRank(null)
                .should
                .eql('');
            ranking.relativeRank(undefined)
                .should
                .eql('');

            // ranking.absoluteRank(null).should.eql('');
            // ranking.absoluteRank(undefined).should.eql('');
        });
    });
});

describe("Scatter plots", function() {
    it('should correlate two datasets', function() {
        let d1 = { "1": { "a": 807, "r": 2 }, "2": { "a": 9.55, "r": 3 }, "3": { "a": 1555.1, "r": 1 } };
        let d2 = { "1": { "a": 39.2, "r": 2 }, "2": { "a": 22.1, "r": 3 }, "3": { "a": 67, "r": 1 } };
        let groups = [{ members: [5, 6] }, { members: [1, 16] }, { members: [2, 3] }, { members: [3, 16] }];

        let expected = [[807, 39.2], [9.55 + 1555.1, 22.1 + 67], [1555.1, 67]]
            .map(e => [Math.log10(e[0]), Math.log10(e[1])]);
        let correlation = scatter.correlate(d1, d2, groups);
        expected.forEach((e,i) => {
            e[0].should.eql(correlation[i][0], 0.01);
            e[1].should.eql(correlation[i][1], 0.01);
        });
    });
});
