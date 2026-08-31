// Netlify Function: /.netlify/functions/subscribe
// Receives { email, firstName, type } from the Neurobuild quiz and:
//   1. Creates/updates the subscriber in Kit
//   2. Tags them with their Neurobuild type
//   3. Adds them to the matching type sequence
//
// Requires an environment variable on this Netlify site:
//   KIT_API_SECRET  — a Kit v4 API key (Kit dashboard → Settings → Developer → API Keys)
//
// NOTE: verify the exact Kit v4 endpoint paths and auth header name against
// Kit's current API docs (https://developers.kit.com) before going live —
// this was written from general API conventions, not a live-tested call.

const TAG_IDS = {
  challenger: 22914187,
  guardian: 22914188,
  storm: 22914189
};

const SEQUENCE_IDS = {
  challenger: 2878203,
  guardian: 2878204,
  storm: 2878205
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const KIT_API_SECRET = process.env.KIT_API_SECRET;
  if (!KIT_API_SECRET) {
    console.error('KIT_API_SECRET is not set on this Netlify site.');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { email, firstName, type } = payload;
  if (!email || !type) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or type' }) };
  }

  const tagId = TAG_IDS[type];
  const sequenceId = SEQUENCE_IDS[type];
  if (!tagId || !sequenceId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown Neurobuild type: ' + type }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Kit-Api-Key': KIT_API_SECRET
  };

  try {
    // 1. Create or update the subscriber, storing their type as a custom field.
    await fetch('https://api.kit.com/v4/subscribers', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email_address: email,
        first_name: firstName || undefined,
        fields: { neurobuild_type: type }
      })
    });

    // 2. Tag them with their Neurobuild type.
    await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email_address: email })
    });

    // 3. Drop them into the matching sequence.
    await fetch(`https://api.kit.com/v4/sequences/${sequenceId}/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email_address: email })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Kit API error', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Kit API error', detail: String(err) })
    };
  }
};
