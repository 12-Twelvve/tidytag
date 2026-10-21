const express = require('express');
const router = express.Router();
const business = require('../config/business.json');
const { pricing } = require('../lib/pricing');

router.get('/', (req, res) => {
  res.json({ business, pricing });
});

module.exports = router;
