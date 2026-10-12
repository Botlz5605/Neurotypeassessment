// Netlify Function: /.netlify/functions/subscribe
// Receives { email, firstName, type } from the Neurobuild quiz and:
//   1. Creates/updates the subscriber in Kit
//   2. Tags them with their Neurobuild type
//   3. Adds them to the matching type sequence
//
// Requires an environment variable on this Netlify site:
//   KIT_API_SECRET  — a Kit v4 API key (Kit dashboard → Settings → Developer → API Keys)
//
// Internal type keys (challenger / guardian / storm) are kept stable so the tag
// and sequence IDs below keep working. Public names are:
//   challenger = The Challenger, guardian = The Operator, storm = The Architect.
//
// Every Kit call is status-checked. Failures are logged to the Netlify function
// logs and returned to the caller, so a rejected call is no longer reported as
// success. The quiz page ignores this response, so a Kit failure never blocks
// the visitor from seeing their result.

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

const KIT = 'https://api.kit.com/v4';

async function kitCall(label, url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (e) { /* ignore */ }
    console.error(`Kit step failed: ${label} -> HTTP ${res.status} ${detail}`);
    return { ok: false, label, status: res.status, detail };
  }
  return { ok: true, label, status: res.status };
}

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
    // 1. Create or update the subscriber. (The type is recorded by the tag below;
    //    no custom field is written, so nothing collides with the existing
    //    "neurotype" field.)
    const created = await kitCall('create subscriber', `${KIT}/subscribers`, headers, {
      email_address: email,
      first_name: firstName || undefined
    });
    if (!created.ok) {
      return { statusCode: 502, body: JSON.stringify({ success: false, failed: [created] }) };
    }

    // 2. Tag them with their Neurobuild type.
    const tagged = await kitCall('add tag', `${KIT}/tags/${tagId}/subscribers`, headers, { email_address: email });

    // 3. Drop them into the matching sequence.
    const sequenced = await kitCall('add to sequence', `${KIT}/sequences/${sequenceId}/subscribers`, headers, { email_address: email });

    const failed = [tagged, sequenced].filter(r => !r.ok);
    if (failed.length) {
      return { statusCode: 502, body: JSON.stringify({ success: false, failed }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Kit API error', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Kit API error', detail: String(err) })
    };
  }
};
