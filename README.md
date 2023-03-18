[![drone.io build status](http://drone.meringlab.org/api/badges/meringlab/paxdb-api/status.svg])](http://drone.meringlab.org/meringlab/paxdb-api)

This is the [pax-db.org][http://pax-db.org] species storage microservice.

# Installation

# Versioning

All versions are `<major>.<minor>.<patch>`, where major and minor follow
[pax-db.org](pax-db.org) versions.


# License

MIT. See "LICENSE.txt".


## Usage

### Build js files
```
node --max-old-space-size=4096 build.js 
```

### Build the image

To create the image `paxdb/api-species`, execute the following command:

```
$ docker build -t paxdb/api-species .
```

### Run the image

```
$ docker run --restart=always -P -d --name paxdb_api_species paxdb/api-species
```

# Update procedure

The process of updating to a new version is as follows:

1. update ./data/abundances (computed by [data-pipeline](https://github.com/meringlab/paxdb-data-pipeline))
2. update lib/cladogram.js
3. update ./data/orthgroups (IMPORTANT! Should include no extra taxonomic levels than required by cladogram.js)
4. update ./data/eggnog5_genome_linkout.txt (linkout to ensembl when available, otherwise to ncbi taxon browser)
5. update ./data/paxdb_uniprot_linkins_ids.tsv (generated from "BLAST_UniProt_ID" terms from STRING v11.5 protein alias file)
6. increment PAYLOAD_VERSION and update connectionString in build.js, then run it to generate lib/species.js, lib/dataset and lib/proteins 
