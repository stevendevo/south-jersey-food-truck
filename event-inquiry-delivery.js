'use strict';

const SENDER = 'Grilly Cheese <grillycheese@grillycheese.net>';

function buildInquiryText(inquiry) {
  return [
    `Event Date: ${inquiry.eventDate || 'N/A'}`,
    `Time: ${inquiry.eventTime || 'N/A'}`,
    `Zip Code: ${inquiry.zipCode || 'N/A'}`,
    `Payer: ${inquiry.payer || 'N/A'}`,
    `Budget: ${inquiry.budget || 'N/A'}`,
    `Name: ${inquiry.name || 'N/A'}`,
    `Phone: ${inquiry.phone || 'N/A'}`,
    `Email: ${inquiry.email || 'N/A'}`,
    '',
    'Additional Details:',
    inquiry.message || 'N/A'
  ].join('\n');
}

async function deliverEventInquiry({ recipient, sendEmail, inquiry }) {
  const destination = typeof recipient === 'string' ? recipient.trim() : '';
  if (!destination) return { ok: false, reason: 'recipient_not_configured' };
  if (typeof sendEmail !== 'function') return { ok: false, reason: 'mail_not_configured' };

  try {
    const response = await sendEmail({
      from: SENDER,
      to: destination,
      subject: `[Event Inquiry] ${inquiry.name || 'General'} — South Jersey Food Truck`,
      text: buildInquiryText(inquiry)
    });

    if (response?.error) {
      return { ok: false, reason: 'provider_rejected', error: response.error };
    }
    if (typeof response?.data?.id !== 'string' || !response.data.id.trim()) {
      return { ok: false, reason: 'provider_unconfirmed' };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'provider_error', error };
  }
}

module.exports = { deliverEventInquiry };
