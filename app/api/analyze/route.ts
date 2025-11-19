import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { image, apiKey } = await req.json();

        if (!image || !apiKey) {
            return NextResponse.json({ error: 'Missing image or API key' }, { status: 400 });
        }

        // System prompt for the AI
        const systemPrompt = `You are a world-class Quantitative Technical Analyst. 
    Analyze the provided chart image with extreme precision.
    
    Structure your response exactly like this:
    
    ## 🎯 SIGNAL: [BUY / SELL / WAIT]
    
    ### 1. Technical Analysis
    - **Trend**: [Bullish/Bearish/Sideways]
    - **Key Levels**: Support at [Price], Resistance at [Price]
    - **Patterns**: [e.g., Double Bottom, Head & Shoulders, etc.]
    - **Indicators**: [RSI value, MACD crossover, etc. if visible]
    
    ### 2. Trade Setup
    - **ENTRY**: [Specific Price]
    - **TAKE PROFIT**: [Specific Price]
    - **STOP LOSS**: [Specific Price]
    - **Risk/Reward Ratio**: [Value]
    
    ### 3. Reasoning
    [Brief explanation of why this trade is valid based on the chart visual]`;

        // Call OpenRouter API
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ai-trade-pro.vercel.app", // Required by OpenRouter
                "X-Title": "AI Trade Pro"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free", // Using a capable vision model. User can change this in code if needed.
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
