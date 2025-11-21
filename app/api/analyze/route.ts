import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Helper to fetch news from DuckDuckGo (Lite version for speed/scraping)
// Helper to fetch news from DuckDuckGo with specific site targeting
async function fetchMarketNews(query: string, sources: string[] = []) {
    try {
        let searchQuery = query + " trading news";

        // If specific sources are provided, restrict search to them
        if (sources.length > 0) {
            const siteOperators = sources.map(s => `site:${s}`).join(' OR ');
            searchQuery = `${query} (${siteOperators})`;
        }

        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        let newsItems: string[] = [];
        $('.result__body').each((i, el) => {
            if (i < 8) { // Get top 8 news for better context
                const title = $(el).find('.result__a').text();
                const snippet = $(el).find('.result__snippet').text();
                const source = $(el).find('.result__url').text().trim();
                newsItems.push(`- [${source}] ${title}: ${snippet}`);
            }
        });

        return newsItems.length > 0 ? newsItems.join('\n') : "No specific news found from selected sources.";
    } catch (error) {
        console.error("News fetch error:", error);
        return "Could not fetch real-time news. Relying on technical analysis only.";
    }
}

export async function POST(req: Request) {
    try {
        const {
            messages, apiKey, model, enableNews, image, systemPrompt,
            newsSources, tradingMode, techAnalysis
        } = await req.json();

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
        }

        // 1. Context Building
        let modeInstruction = "";
        if (tradingMode === 'scalping') {
            modeInstruction = "TRADING MODE: SCALPING. Focus on short-term price action (1m, 5m, 15m), quick entries/exits, and momentum indicators. Tight stop losses.";
        } else if (tradingMode === 'long') {
            modeInstruction = "TRADING MODE: SWING/LONG-TERM. Focus on higher timeframes (4H, Daily, Weekly), macro trends, and fundamental drivers. Wider stop losses and larger targets.";
        }

        let techInstruction = "";
        if (techAnalysis) {
            techInstruction = "TECHNICAL ANALYSIS REQUIRED: You MUST utilize RSI, MACD, Bollinger Bands, and Elliott Wave Theory in your analysis. Identify key support/resistance levels precisely.";
        }

        let systemContext = systemPrompt || `You are a world-class Quantitative Technical & Fundamental Analyst.`;

        systemContext += `\n\n${modeInstruction}\n${techInstruction}
        
        Format your response EXACTLY as follows:
        
        **SIGNAL**: [BUY / SELL / WAIT]
        **PAIR**: [e.g. XAUUSD]
        **TIMEFRAME**: [e.g. H1, H4]
        **ENTRY**: [Price Range]
        **TAKE PROFIT**: [Price Targets]
        **STOP LOSS**: [Price]
        **CONFIDENCE**: [1-100]%
        
        **REASONING**:
        [Detailed analysis covering Trend, Support/Resistance, Indicators, and News Impact]`;

        // 2. Add Real-time News if enabled
        if (enableNews) {
            // Extract potential pair from user message or default
            const lastUserMsg = messages[messages.length - 1].content;
            const pairMatch = lastUserMsg.match(/\b[A-Z]{3}\/?[A-Z]{3}\b/); // Simple regex for pairs like EURUSD or EUR/USD
            const searchTopic = pairMatch ? pairMatch[0] : "Global Market Sentiment";

            const news = await fetchMarketNews(searchTopic, newsSources);
            systemContext += `\n\n**REAL-TIME MARKET NEWS CONTEXT (Sources: ${newsSources?.join(', ') || 'General'}):**\n${news}`;
        }

        // 3. Construct OpenRouter Payload
        // Sanitize messages: remove 'image' property from history to avoid huge payloads/errors
        const cleanMessages = messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content
        }));

        const conversation = [
            {
                role: 'system',
                content: systemContext
            },
            ...cleanMessages
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
            console.error("OpenRouter API Error Details:", JSON.stringify(data.error, null, 2));
            throw new Error(data.error.message || 'Provider returned error');
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
                            footer: { text: `Mode: ${tradingMode} | Powered by AI Trading System` },
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
