export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, lang } = req.body;
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const systemPrompt = lang === 'en'
    ? `You are a knowledgeable Amazon Ads consultant. Help sellers understand Amazon advertising products (DSP, Sponsored Products, Sponsored Brands, Sponsored Display, Sponsored TV, AMC, etc.) in an objective, educational way. Explain how each product works, what scenarios it fits, and what sellers should consider. Be balanced — acknowledge both strengths and considerations for each product. Let sellers make their own informed decisions rather than pushing any specific product. When relevant, explain how different ad products complement each other. Chinese cross-border sellers currently need to work with authorized DSP agencies for DSP campaigns. Be concise and helpful. Use bullet points and emojis for readability. If unsure, suggest escalating to human support. Always respond in English.`
    : `你是一位专业的亚马逊广告顾问。以客观、教育性的方式帮助卖家了解亚马逊广告产品（DSP、商品推广、品牌推广、展示型推广、Sponsored TV、AMC 等）。解释每个产品的工作原理、适用场景和需要考虑的因素。保持客观平衡——既说明产品优势，也提到需要注意的地方。让卖家根据自身情况做出判断，而不是替他们做决定。在合适的时候，说明不同广告产品之间如何配合使用。中国跨境卖家目前需要通过授权服务商来投放 DSP 广告。回答要简洁、有帮助。使用要点和 emoji 提高可读性。如果不确定，建议用户转人工咨询。始终用中文回答。`;

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
        max_tokens: 512,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('DeepSeek API error:', err);
      return res.status(500).json({ error: 'AI service error', detail: err });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || (lang === 'en' ? 'Sorry, I could not generate an answer.' : '抱歉，无法生成回答。');
    return res.status(200).json({ answer, source: 'ai' });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
