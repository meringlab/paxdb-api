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
