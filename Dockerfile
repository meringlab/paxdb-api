# Version: 0.1
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
FROM       ubuntu:xenial
MAINTAINER Milan Simonovic <milan.simonovic@imls.uzh.ch>


# To compile and install native addons from npm,
# build tools might be needed:
RUN sudo apt-get update
RUN sudo apt-get install -y libc-dev build-essential curl python

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
# will also install npm v3.x:
RUN apt-get install -y nodejs

RUN apt-get install -y git

ENV WD /var/www/paxdb
WORKDIR  $WD
COPY . $WD

RUN useradd -ms /bin/bash paxdb
RUN chown -R paxdb /var/www/paxdb
USER paxdb
RUN npm install

EXPOSE 3000

# DEFAULTS, override when creating a container:
ENV NODE_ENV production

ENV SERVICE_TAGS "paxdb,api"
ENV SERVICE_NAME species_v4.0

# VOLUME $WD

CMD ["node", "--max-old-space-size=2048", "./bin/www"]
