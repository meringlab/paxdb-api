const express = require('express');
const path = require('path');
const fs = require('fs');
const url = require('url');
const swaggerUi = require('swagger-ui-express');
const jsYaml = require('js-yaml');

const logger = require('bunyan')
    .createLogger({
        name: 'paxdb-API',
        module: 'app'
        //TODO server / host / process ..
    });

const routes = require('./routes/index');
const species = require('./routes/species');
const dataset = require('./routes/dataset');
const protein = require('./routes/protein');
const proteins = require('./routes/proteins');

const app = express();

try {
    // eslint-disable-next-line detect-non-literal-fs-filename
    const v1ApiDoc = fs.readFileSync(path.resolve(__dirname, './lib/paxdb-openapi.yaml'), 'utf8');
    const apidoc = jsYaml.safeLoad(v1ApiDoc, { json: true });
    app.use('/v1/swagger-ui', swaggerUi.serve, swaggerUi.setup(apidoc));
    apidoc.servers.forEach((server) => {
        logger.info(`swagger-ui mounted at ${server.url}/swagger-ui`);
    });
} catch (e) {
    logger.error('failed to read the api yaml spec', e);
}

app.use((req, res, next) => {
    // looks like it's not possible to list many hosts so need to mirror back allowed:
    if (req.headers.origin) {
        try {
            const origin = url.parse(req.headers.origin, false).hostname;
            if (origin.endsWith('pax-db.org')
                || origin.endsWith('string-db.org')
                || origin === 'https://editor.swagger.io'
                || origin.endsWith('localhost')
                || origin.endsWith('127.0.0.1')
            ) {
                res.header('Access-Control-Allow-Origin', req.headers.origin);
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            }
        } catch (e) {
            // logger.error('failed to set cors: ', JSON.stringify(req.headers));
            logger.error('failed to set cors: ', req.headers);
        }
    }
    next();
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/', routes);
app.use('/species', species);
app.use('/dataset', dataset);
app.use('/protein', protein);
app.use('/proteins', proteins);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(err.status || 500);
    res.render('error', {
        message: err.message
    });
});

module.exports = app;
