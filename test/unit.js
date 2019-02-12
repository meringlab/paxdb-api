const { expect, assert } = require('chai');
const should = require('should');
const datasetLib = require('../lib/dataset');

describe("Ranking", function () {
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
        it('should handle missing abundances', function () {
            ranking.relativeRank(null).should.eql('');
            ranking.relativeRank(undefined).should.eql('');

            // ranking.absoluteRank(null).should.eql('');
            // ranking.absoluteRank(undefined).should.eql('');
        });
    });
});
