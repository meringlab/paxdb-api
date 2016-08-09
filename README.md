This is the [pax-db.org][http://pax-db.org] species storage microservice.

# Current Status

There is an email discussion list
[pax-db@googlegroups.com](mailto:pax-db@googlegroups.com),
also [as a forum in the
browser](https://groups.google.com/forum/#!forum/pax-db).


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
$ docker build -t paxdb/species .
```

### Run the image

```
$ docker run -d --name paxdb-species paxdb/species
```
