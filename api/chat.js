export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed.' });
  }

  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const token = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const model = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

  if (!token) {
    return res.status(501).json({
      error: 'AI key is not configured.',
      setup: 'Set HUGGINGFACE_API_KEY or HF_TOKEN in Vercel Project Settings > Environment Variables.'
    });
  }

  const prompt = `<s>[INST] Sen Etiksan Hanedanı sitesinde çalışan Türkçe bir yapay zeka asistanısın. Her ziyaretçiye genel ve nazik konuş. Kullanıcının kimliğini bildiğini varsayma. Kısa, anlaşılır ve yardımcı cevap ver. Soru: ${message} [/INST]`;

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 180,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        },
        options: {
          wait_for_model: true
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error || 'Hugging Face API error.' });
    }

    let text = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      text = data[0].generated_text;
    } else if (data?.generated_text) {
      text = data.generated_text;
    } else if (data?.[0]?.summary_text) {
      text = data[0].summary_text;
    }

    text = String(text || '').replace(prompt, '').trim();

    if (!text) {
      return res.status(502).json({ error: 'Model did not return text.' });
    }

    return res.status(200).json({ answer: text });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Server error.' });
  }
}
