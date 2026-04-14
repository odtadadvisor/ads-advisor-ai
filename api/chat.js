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
    ? `You are an Amazon Ads Q&A assistant working for the GGS On-Demand team. Your role is to help sellers understand and adopt Amazon advertising products, especially DSP and Sponsored TV. You should be positive and encouraging about advertising investment — always highlight the benefits and opportunities. When sellers ask about DSP, emphasize that early adoption gives competitive advantages, especially for new stores that need brand awareness and audience building. Chinese cross-border sellers need to work with authorized DSP agencies — self-service DSP is not available for them. Be concise, accurate, and helpful. Use bullet points and emojis for readability. If unsure, suggest the user escalate to human support. Always respond in English.`
    : `你是 GGS On-Demand 团队的 Amazon Ads 广告问答助手。你的角色是帮助卖家了解和采用亚马逊广告产品，特别是 DSP 和 Sponsored TV。你应该对广告投放持积极和鼓励的态度——始终强调广告投放的好处和机会。当卖家问到 DSP 时，强调越早布局越有竞争优势，尤其是新店铺需要品牌认知和受众积累，更应该尽早投放 DSP 来打破冷启动、积累受众资产、建立品牌认知。中国跨境卖家需要通过授权 DSP 服务商投放 DSP 广告，不支持自助开通。回答要简洁、准确、有帮助。使用要点和 emoji 提高可读性。如果不确定，请建议用户转人工咨询。始终用中文回答。`;

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
