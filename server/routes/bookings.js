const express = require('express');
const router = express.Router();
const { calcQuote } = require('../lib/pricing');
const { sendBookingEmails } = require('../lib/email');
const { saveBooking } = require('../lib/store');

router.post('/', async (req, res) => {
  const { name, email, phone, address, date, notes, propertyId, bed, bath, tierId, addonIds, freqId } = req.body || {};

  if (!name || !email || !phone || !address || !date) {
    return res.status(400).json({ error: 'Missing required fields: name, email, phone, address, date' });
  }

  const quote = calcQuote({ propertyId, bed, bath, tierId, addonIds, freqId });
  const bookingRef = 'TT-' + Math.floor(100000 + Math.random() * 900000);

  const booking = {
    bookingRef, name, email, phone, address, date,
    notes: notes || '', quote, createdAt: new Date().toISOString()
  };

  try {
    await saveBooking(booking);
  } catch (e) {
    console.error('Failed to persist booking:', e.message);
  }

  try {
    const emailResult = await sendBookingEmails(booking);
    return res.status(201).json({ bookingRef, quote, emailSent: !!emailResult.sent });
  } catch (e) {
    console.error('Failed to send booking emails:', e.message);
    return res.status(201).json({ bookingRef, quote, emailSent: false, warning: 'Booking saved but email failed to send.' });
  }
});

module.exports = router;
