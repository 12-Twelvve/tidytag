require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const configRouter = require('./routes/config');
const quoteRouter = require('./routes/quote');
const reviewsRouter = require('./routes/reviews');
const bookingsRouter = require('./routes/bookings');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/config', configRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/bookings', bookingsRouter);

app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Tidy Tag server listening on ${PORT}`));
