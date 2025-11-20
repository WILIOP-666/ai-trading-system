import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Helper to fetch news from DuckDuckGo (Lite version for speed/scraping)
async function fetchMarketNews(query: string) {
    try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " trading news")}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        let newsItems: string[] = [];
        $('.result__body').each((i, el) => {
            if (i < 5) { // Get top 5 news
                const title = $(el).find('.result__a').text();
                const snippet = $(el).find('.result__snippet').text();
                newsItems.push(`- ${title}: ${snippet}`);
            }
        });

        return newsItems.join('\n');
    } catch (error) {
        console.error("News fetch error:", error);
        return "Could not fetch real-time news. Relying on technical analysis only.";
    }
}

export async function POST(req: Request) {
    try {
        const { messages, apiKey, model, enableNews, image } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
        }

        // 1. Context Building (News)
        let systemContext = `You are a world-class Quantitative Technical & Fundamental Analyst. 
        Your goal is to analyze trading charts and provide high-probability setups.
        
        Format your response EXACTLY as follows:
        
        **SIGNAL**: [BUY / SELL / WAIT]
        **PAIR**: [e.g. XAUUSD]
        **TIMEFRAME**: [e.g. H1, H4]
        **ENTRY**: [Price Range]
        **TAKE PROFIT**: [Price Targets]
        **STOP LOSS**: [Price]
        **CONFIDENCE**: [1-100]%
        
        **REASONING**:
        [Detailed technical analysis covering Trend, Support/Resistance, Indicators (RSI, MACD, EMA), and Price Action patterns]
        `;

        // 2. Add Real-time News if enabled
        if (enableNews) {
            // Try to detect pair from previous messages or default to "Global Market"
            // For simplicity, we search for general market sentiment or specific pair if mentioned
            const news = await fetchMarketNews("Forex Crypto Gold Market Sentiment");
            systemContext += `\n\n**REAL-TIME MARKET NEWS CONTEXT (Use this for Fundamental Analysis):**\n${news}`;
        }

        // 3. Construct OpenRouter Payload
        const conversation = [
            {
                role: 'system',
                content: systemContext
            },
            ...messages
        ];

        // If there's a new image in this turn, add it to the last user message
        if (image) {
            const lastMsg = conversation[conversation.length - 1];
            if (lastMsg.role === 'user') {
                lastMsg.content = [
                    { type: "text", text: lastMsg.content },
                    {
                        type: "image_url",
                        image_url: {
                            url: image // base64
                        }
                    }
                ];
            }
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://ai-trading-system.vercel.app',
                'X-Title': 'AI Trading System',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'google/gemini-2.0-flash-exp:free',
                messages: conversation,
                temperature: 0.2,
                max_tokens: 1000
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'OpenRouter API Error');
        }

        const resultText = data.choices[0].message.content;

        // 4. Send to Discord (if it looks like a signal)
        if (resultText.includes('SIGNAL') || resultText.includes('BUY') || resultText.includes('SELL')) {
            try {
                await fetch('https://discord.com/api/webhooks/1441089685651722330/x98blnkH_prlvFnye7r1r9Z0idFsRRWWQIfHHp9_xWCekwO0TeVJkUhgtyfqH0KVpwU-', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: "AI Trading Copilot",
                        avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
                        embeds: [{
                            title: "🚀 New AI Trading Signal",
                            description: resultText.substring(0, 4096), // Discord limit
                            color: resultText.includes('BUY') ? 5763719 : resultText.includes('SELL') ? 15548997 : 9807270, // Green, Red, or Gray
                            footer: { text: "Powered by AI Trading System" },
                            timestamp: new Date().toISOString()
                        }]
                    })
                });
            } catch (err) {
                console.error("Discord Webhook Error:", err);
            }
        }

        return NextResponse.json({ result: resultText });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
