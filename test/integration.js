const supertest = require('supertest');
const { expect, assert } = require('chai');


describe("api", function () {
  const client = supertest(global.apiapp);

  describe("species", function () {
    it("can lookup species by taxon", function () {
      client
        .get('/species/882')
        .expect('Content-Type', /application\/json.*/)
        .expect(200)
        .then(response => {
          assert(882 === response.body.id);
          assert('Desulfovibrio vulgaris Hildenborough' === response.body.compact_name);
        });
    });
    it('can correlate against another species', function (done) {
      client
        .get('/species/9606/correlate/10090')
        .expect(200)
        .expect('Content-Type', /image\/svg\+xml/)
        .end(done);
    });
    it('fails for unknown taxa', function (done) {
      client
        .get('/species/-1234')
        .expect(404)
        .end(done);
    });
  });

  describe('protein', function () {
    it('can lookup a protein by id', function () {
      client
        .get('/protein/2117454')
        .expect('Content-Type', /application\/json.*/)
        .expect(200)
        .then(response => {
          assert(2117454 === response.body.id);
          assert('10116.ENSRNOP00000005048' === response.body.externalId);
          assert('Clk4' === response.body.name);
          assert('Q6AYK7' === response.body.uniprotId);
        });
    });
    it('can lookup multiple proteins by id', function () {
      client
        .get('/proteins?ids=4909,4028')
        .expect('Content-Type', /application\/json.*/)
        .expect(200)
        .then(response => {
          assert(2 === response.body.length);
        });
    });
    it('fails for unknown id', function (done) {
      client
        .get('/protein/-1234')
        .expect(404)
        .end(done);
    });
  });

  describe('dataset', function () {
    it('can lookup dataset by id', function () {
      client
        .get('/dataset/882/97')
        .expect('Content-Type', /application\/json.*/)
        .expect(200)
        .then(response => {
          assert(97 === response.body.id);
          assert('WHOLE_ORGANISM' === response.body.organ);
        });
    });
    it('can load abundances', function () {
      client
        .get('/dataset/882/97/abundances')
        .expect('Content-Type', /application\/json.*/)
        .expect(200)
        .then(response => {
          let protein = response.body[0];
          assert(6004 === protein.id);
          assert('DVU_2405' === protein.name);
          assert(0 === protein.rank);
          assert(1000 < protein.abundance);
        });
    });
    it('can plot histogram', function (done) {
      client
        .get('/dataset/97/histogram')
        .expect(200)
        .expect('Content-Type', /image\/svg\+xml/)
        .end(done);
    });
    it('can correlate two datasets', function (done) {
      client
        .get('/dataset/100/correlate/101')
        .expect(200)
        .expect('Content-Type', /image\/svg\+xml/)
        .end(done);
    });
  });
});
