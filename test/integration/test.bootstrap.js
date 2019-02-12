process.env.NODE_ENV='test';

//it takes a couple of sec to load the app
// so try to load it only once (it's read-only anyway)
global.apiapp = require('../../app');
