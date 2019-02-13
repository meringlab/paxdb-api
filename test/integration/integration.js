const supertest = require('supertest');
const { expect, assert } = require('chai');
const should = require('should');


describe("api", function() {
    expect(global.apiapp).to.not.be.undefined;
    const client = supertest(global.apiapp);

    describe("species", function() {
        it("can lookup species by taxon", function() {
            client
                .get('/species/882')
                .expect('Content-Type', /application\/json.*/)
                .expect(200)
                .end(function(err, response) {
                    should.not.exist(err);
                    response.body.should.have.property('id')
                    response.body.id.should.eql(882)
                    expect(response.body.compact_name)
                        .to
                        .be
                        .eql('Desulfovibrio vulgaris Hildenborough');
                });
        });
        it('can correlate against another species', function(done) {
            client
                .get('/species/9606/correlate/10090')
                .expect(200)
                .expect('Content-Type', /image\/svg\+xml/)
                .end(done);
        });
        it('fails for unknown taxa', function(done) {
            client
                .get('/species/-1234')
                .expect(404)
                .end(done);
        });
        it('fails for known stringdb but not paxdb taxa', function(done) {
            client
                .get('/species/39946') // indian rice
                .expect(404)
                .end(done);
        });
    });

    describe('protein', function() {
        it('can lookup a protein by id', function() {
            client
                .get('/protein/2117454')
                .expect('Content-Type', /application\/json.*/)
                .expect(200)
                .end(function(err, response) {
                    should.not.exist(err);
                    response.body.id.should.eql(2117454);
                    response.body.externalId.should.eql('10116.ENSRNOP00000005048');
                    response.body.name.should.eql('Clk4');
                    response.body.uniprotId.should.eql('Q6AYK7');
                });
        });
        it('can lookup multiple proteins by id', function() {
            client
                .get('/proteins?ids=4909,4028')
                .expect('Content-Type', /application\/json.*/)
                .expect(200)
                .end(function(err, response) {
                    should.not.exist(err);
                    response.body.proteins.length.should.eql(2);
                });
        });
        it('fails for unknown id', function(done) {
            client
                .get('/protein/1115590') //it's a valid string-db protein but not in paxdb
                .expect(404)
                .end(done);
        });
    });

    describe('dataset', function() {
        it('can lookup dataset by id', function() {
            client
                .get('/dataset/882/97')
                .expect('Content-Type', /application\/json.*/)
                .expect(200)
                .end(function(err, response) {
                    should.not.exist(err);
                    response.body.id.should.eql(97);
                    response.body.organ.should.eql('WHOLE_ORGANISM');
                });
        });
        it('can load abundances', function() {
            client
                .get('/dataset/882/97/abundances')
                .expect('Content-Type', /application\/json.*/)
                .expect(200)
                .end(function(err, response) {
                    should.not.exist(err);
                    let protein = response.body[0];
                    protein.id.should.eql(6004);
                    protein.name.should.eql('DVU_2405');
                    protein.rank.should.eql(0);
                    protein.abundance.should.be.above(1000);
                });
        });
        it('can plot histogram', function(done) {
            client
                .get('/dataset/97/histogram')
                .expect(200)
                .expect('Content-Type', /image\/svg\+xml/)
                .end(done);
        });
        it('can correlate two datasets', function(done) {
            client
                .get('/dataset/100/correlate/101')
                .expect(200)
                .expect('Content-Type', /image\/svg\+xml/)
                .end(done);
        });
    });
});
