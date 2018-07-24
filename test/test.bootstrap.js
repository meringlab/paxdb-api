process.env.NODE_ENV='test';

//it takes 2min to load the app so try to load it only once (it's read-only anyway)
global.apiapp = require('../app');
