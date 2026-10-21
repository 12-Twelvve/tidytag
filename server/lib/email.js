const nodemailer = require('nodemailer');
const business = require('../config/business.json');

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

function summaryText(b) {
  const { quote } = b;
  return [
    `Booking ref: ${b.bookingRef}`,
    `Property: ${quote.property.label}, ${quote.bed} bed / ${quote.bath} bath`,
    `Clean level: ${quote.tier.label}`,
    `Add-ons: ${quote.addons.map(a => a.label).join(', ') || 'None'}`,
    `Frequency: ${quote.freq.label}`,
    `Estimated total: ${quote.currency} $${quote.total}`,
    `Preferred date: ${b.date}`,
    `Address: ${b.address}`,
    `Notes: ${b.notes || '—'}`
  ].join('\n');
}

async function sendBookingEmails(booking) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || `${business.name} <no-reply@example.com>`;
  const text = summaryText(booking);

  if (!transport) {
    // No SMTP configured — log instead of throwing, so local dev still works.
    console.log('--- SMTP not configured, would have sent: ---');
    console.log(`To: ${business.bookingEmail}  Reply-To: ${booking.email}`);
    console.log(text);
    return { sent: false, reason: 'SMTP not configured' };
  }

  await transport.sendMail({
    from,
    to: business.bookingEmail,
    replyTo: booking.email,
    subject: `New booking request ${booking.bookingRef} — ${booking.name}`,
    text: `New booking from ${booking.name} (${booking.email}, ${booking.phone})\n\n${text}`
  });

  await transport.sendMail({
    from,
    to: booking.email,
    subject: `We've received your booking — ${booking.bookingRef}`,
    text: `Hi ${booking.name},\n\nThanks for booking with ${business.name}. Here's a copy of your request:\n\n${text}\n\nWe'll confirm your time slot shortly.\n\n— ${business.name}`
  });

  return { sent: true };
}

module.exports = { sendBookingEmails };
