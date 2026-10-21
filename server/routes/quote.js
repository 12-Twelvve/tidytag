const express = require('express');
const router = express.Router();
const { calcQuote } = require('../lib/pricing');

router.post('/', (req, res) => {
  try {
    const result = calcQuote(req.body || {});
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: 'Could not calculate quote', detail: e.message });
  }
});

module.exports = router;
