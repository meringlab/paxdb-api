# Version: 0.2
# to run:
## $ sudo docker build -t paxdb/api-species .
### for testing:
## $ sudo docker run --restart=always -p 13001:3000 -d --name paxdb_api_species paxdb/api-species
### for production:
## $ sudo docker tag 6523b3850580  docker-registry.meringlab.org:5443/paxdb/api:blue
## $ sudo docker push docker-registry.meringlab.org:5443/paxdb/api:blue
### docker-machine env swarm master then:
## $ docker service update --image docker-registry.meringlab.org:5443/paxdb/api:blue  paxdb_api_species_4
### see https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/
FROM       node:10-alpine
LABEL api-species.authors="Milan Simonovic, Qingyao Huang"

EXPOSE 3000

ENV WD /var/www/paxdb
WORKDIR  $WD

# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk update && apk --no-cache --virtual build-dependencies add python make

# trick: avoid npm install
COPY package.json .
# make npm install only fetch packages required for production:
ENV NODE_ENV "production"
RUN npm install

RUN apk del build-dependencies

COPY . .

ENV SERVICE_TAGS "paxdb,api"
ENV SERVICE_NAME "species_v5.0"

CMD ["node", "--max-old-space-size=4096", "./bin/www"]
