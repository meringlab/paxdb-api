This is the [pax-db.org][http://pax-db.org] species storage microservice.

# Installation

# Versioning

All versions are `<major>.<minor>.<patch>`, where major and minor follow
[pax-db.org](pax-db.org) versions.


# License

MIT. See "LICENSE.txt".


## Usage

### Build the image

To create the image `paxdb/species`, execute the following command:

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
2. update ./data/orthgroups (computed by Damian but should be in a repo of its own)
3. update ./data/eggnog4_genome_linkout.txt (last time Kristoffer Forslund <forslund@embl.de> did it)
4. update ./data/paxdb_uniprot_linkins_ids.tsv (a pruned down version of string_uniprot_linkins computed by Damian)
5. update lib/cladogram.js
6. increment PAYLOAD_VERSION and update connectionString in build.js, then run it to generate lib/species.js, lib/dataset and lib/proteins 
