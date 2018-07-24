const express = require('express');
const path = require('path');

const logger = require('bunyan').createLogger({
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

// view engine setup
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
  app.use((err, req, res) => {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message
  });
});

process.on('uncaughtException', (err) => {
  logger.fatal(err, 'uncaughtException');
  process.exit(1);
});

module.exports = app;
