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
FROM       node:8-alpine
MAINTAINER Milan Simonovic <milan.simonovic@imls.uzh.ch>

EXPOSE 3000

# DEFAULTS, override when creating a container:
ENV NODE_ENV production

ENV WD /var/www/paxdb
WORKDIR  $WD
# trick: avoid npm install
COPY package.json .
RUN npm install
COPY . .

ENV SERVICE_TAGS "paxdb,api"
ENV SERVICE_NAME species_v4.1

CMD ["node", "--max-old-space-size=2048", "./bin/www"]
