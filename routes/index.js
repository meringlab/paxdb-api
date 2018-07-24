const express = require('express');

const router = new express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'pax-db.org API::Species' });
});

module.exports = router;
