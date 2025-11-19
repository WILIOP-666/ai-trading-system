import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { image, apiKey } = await req.json();

        if (!image || !apiKey) {
            return NextResponse.json({ error: 'Missing image or API key' }, { status: 400 });
        }

        // 1. Mock News Context (Simulating real-time market data fetch)
        // In a production environment, we would call NewsAPI or Bing Search here.
        const newsContext = `
    LATEST MARKET NEWS (Real-time Context):
    - USD: Federal Reserve hints at potential rate cuts later this year. Inflation data came in lower than expected.
    - EUR: ECB maintains hawkish stance on inflation, signaling strength.
    - CRYPTO: Bitcoin ETF inflows reach record highs, pushing sentiment to "Extreme Greed".
    - GOLD: Safe-haven demand increases amidst geopolitical tensions in the Middle East.
    - JPY: Bank of Japan considering ending negative interest rates.
    `;

        // 2. System prompt for the AI
        const systemPrompt = `You are a world-class Quantitative Technical & Fundamental Analyst. 
    
    CONTEXT:
    ${newsContext}

    TASK:
    Analyze the provided chart image combined with the market news context above.
    
    Structure your response exactly like this:
    
    ## 🎯 SIGNAL: [BUY / SELL / WAIT]
    
    ### 1. Fundamental Analysis (News Based)
    - **Sentiment**: [Bullish/Bearish] based on news.
    - **Key Drivers**: [Mention relevant news from context]
    
    ### 2. Technical Analysis (Chart Based)
    - **Trend**: [Bullish/Bearish/Sideways]
    - **Key Levels**: Support at [Price], Resistance at [Price]
    - **Patterns**: [e.g., Double Bottom, Head & Shoulders, etc.]
    
    ### 3. Trade Setup
    - **ENTRY**: [Specific Price]
    - **TAKE PROFIT**: [Specific Price]
    - **STOP LOSS**: [Specific Price]
    - **Risk/Reward Ratio**: [Value]
    
    ### 4. Reasoning
    [Synthesize chart data with news context for a final verdict]`;

        // 3. Call OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-trade-pro.vercel.app",
                "X-Title": "AI Trade Pro"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free", // Using Vision model
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: systemPrompt },
                            { type: "image_url", image_url: { url: image } }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'OpenRouter API Error');
        }

        const analysisResult = data.choices[0].message.content;

        return NextResponse.json({ result: analysisResult });

    } catch (error: any) {
        console.error('Analysis Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
