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
    ? `You are an Amazon Ads Q&A assistant. Answer questions about Amazon advertising products (DSP, Sponsored Products, Sponsored Brands, Sponsored Display, Sponsored TV, AMC, etc.) based on official Amazon Ads documentation. Be concise, accurate, and helpful. Use bullet points and emojis for readability. If you're not sure about something, say so and suggest the user escalate to human support. Important: Chinese cross-border sellers need to work with authorized DSP agencies — self-service DSP is not available for them. Always respond in English.`
    : `你是一个 Amazon Ads 广告问答助手。基于亚马逊广告官方资料回答关于 Amazon 广告产品（DSP、商品推广、品牌推广、展示型推广、Sponsored TV、AMC 等）的问题。回答要简洁、准确、有帮助。使用要点和 emoji 提高可读性。如果不确定，请说明并建议用户转人工咨询。重要提醒：中国跨境卖家需要通过授权 DSP 服务商投放 DSP 广告，不支持自助开通。始终用中文回答。`;

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
        max_tokens: 1024,
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
