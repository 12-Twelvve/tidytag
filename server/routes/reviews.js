const express = require('express');
const router = express.Router();
const fallback = require('../config/reviews-fallback.json');

let cache = { data: null, ts: 0 };
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

router.get('/', async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return res.json(fallback);
  }

  if (cache.data && Date.now() - cache.ts < CACHE_TTL) {
    return res.json(cache.data);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total,reviews&key=${apiKey}`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.status !== 'OK') throw new Error(json.status);

    const result = {
      rating: json.result.rating,
      total: json.result.user_ratings_total,
      reviews: (json.result.reviews || []).slice(0, 6).map(rv => ({
        author: rv.author_name,
        rating: rv.rating,
        text: rv.text,
        relative_time: rv.relative_time_description
      }))
    };
    cache = { data: result, ts: Date.now() };
    res.json(result);
  } catch (e) {
    console.error('Google Places fetch failed, serving fallback reviews:', e.message, e.cause);
    res.json(fallback);
  }
});

module.exports = router;
