let firestore = null;
try {
  const { Firestore } = require('@google-cloud/firestore');
  // On Cloud Run this authenticates automatically via the service's
  // Application Default Credentials — no key file needed in production.
  firestore = new Firestore();
} catch (e) {
  console.warn('Firestore client not initialized:', e.message);
}

async function saveBooking(booking) {
  if (!firestore) {
    console.log('--- Firestore not configured, booking not persisted ---');
    return { persisted: false };
  }
  await firestore.collection('bookings').doc(booking.bookingRef).set(booking);
  return { persisted: true };
}

module.exports = { saveBooking };
