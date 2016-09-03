# Version: 0.1
# to run:
## $ sudo docker build -t paxdb/api-species .
## $ sudo docker run --restart=always -p 13001:3000 -d --name paxdb_api_species paxdb/api-species
#
FROM meringlab/node5
MAINTAINER Milan Simonovic <milan.simonovic@imls.uzh.ch>

ENV WD /var/www/paxdb
WORKDIR  $WD
COPY . $WD

RUN useradd -ms /bin/bash paxdb
RUN chown -R paxdb /var/www/paxdb
USER paxdb
RUN npm install

EXPOSE 3000

# DEFAULTS, override when creating a container:
ENV CONSUL_HOST 'tethys.meringlab.org'
ENV NODE_ENV production

ENV SERVICE_TAGS "paxdb,api"
ENV SERVICE_NAME species_v4.0

# VOLUME $WD

CMD ["node", "--max-old-space-size=2048", "./bin/www"]
