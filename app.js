var express = require('express');
var path = require('path');

var routes = require('./routes/index');
var species = require('./routes/species');
var dataset = require('./routes/dataset');
var protein = require('./routes/protein');
var proteins = require('./routes/proteins');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/', routes);
app.use('/species', species);
app.use('/dataset', dataset);
app.use('/protein', protein);
app.use('/proteins', proteins);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

process.on('uncaughtException', (err) => {
  //TODO test this
  logger.fatal(err, 'uncaughtException');
  //TODO  if(process.env.NODE_ENV === 'production') { sendEmail? twilio?
  process.exit(1);
});

module.exports = app;
