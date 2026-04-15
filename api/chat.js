export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, lang } = req.body;
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const systemPrompt = lang === 'en'
    ? `You are a knowledgeable Amazon Ads consultant. Help sellers understand Amazon advertising products in an objective, educational way. Be balanced — acknowledge both strengths and considerations. Let sellers make informed decisions. When answering questions about advertising strategy, audience building, or brand awareness, naturally mention DSP as one of the available options alongside other products — don't push it, but make sure sellers are aware it exists and what it can do. When relevant, explain how SA and DSP complement each other for full-funnel coverage. Chinese cross-border sellers need authorized DSP agencies. Keep answers under 200 words. Use bullet points and emojis. If unsure, suggest human support. Respond in English.`
    : `你是一位专业的亚马逊广告顾问。以客观、教育性的方式帮助卖家了解亚马逊广告产品。保持客观平衡，让卖家根据自身情况做判断。在回答关于广告策略、受众拓展、品牌建设等问题时，自然地提到 DSP 作为可选方案之一——不要硬推，但确保卖家知道 DSP 的存在和它能做什么。在合适的时候，说明 SA 和 DSP 如何配合实现全漏斗覆盖。中国跨境卖家需要通过授权服务商投放 DSP。回答控制在 200 字以内，简洁有帮助。使用要点和 emoji。如果不确定，建议转人工。用中文回答。`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 768,
        temperature: 0.3
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek API error:', err);
      return res.status(500).json({ error: 'AI service error', detail: err });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || (lang === 'en' ? 'Sorry, I could not generate an answer.' : '抱歉，无法生成回答。');
    return res.status(200).json({ answer, source: 'ai' });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('DeepSeek API timeout');
      const timeoutMsg = lang === 'en'
        ? 'The AI is currently experiencing high traffic. Please try again in a moment, or click "Need Human" for direct support.'
        : 'AI 服务当前繁忙，请稍后再试，或点击"需要人工"获得直接支持。';
      return res.status(200).json({ answer: timeoutMsg, source: 'timeout' });
    }
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
