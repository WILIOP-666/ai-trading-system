"use client";

import { useState, useEffect } from 'react';
import { Search, ArrowLeft, ExternalLink, Newspaper } from 'lucide-react';
import Link from 'next/link';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function NewsPage() {
    const [query, setQuery] = useState('Crypto Forex Market');
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        AOS.init({ duration: 1000, once: true });
        handleSearch(); // Initial fetch
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        try {
            // Fetch real news summary via our AI agent
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `Find and summarize the top 4 latest and most important trading news articles about "${query}". 
                        
                        Format your response EXACTLY like this for each article (do not add any other text):
                        
                        TITLE: [Article Title]
                        SOURCE: [Source Name, e.g. Bloomberg]
                        TIME: [e.g. 2 hours ago]
                        SNIPPET: [Brief summary, max 2 sentences]
                        ---`
                    }],
                    apiKey: localStorage.getItem('openrouter_key') || '',
                    model: 'google/gemini-2.0-flash-exp:free', // Fast model for news
                    enableNews: true, // Force web search
                    newsSources: ['investing.com', 'forexfactory.com', 'bloomberg.com', 'reuters.com', 'coindesk.com'],
                    systemPrompt: "You are a news aggregator. Provide strictly formatted news summaries."
                })
            });

            const data = await response.json();
            const resultText = data.result || "";

            // Parse the text response into news items
            const parsedNews: any[] = [];
            const articles = resultText.split('---');

            articles.forEach((art: string) => {
                const title = art.match(/TITLE:\s*(.*)/)?.[1];
                const source = art.match(/SOURCE:\s*(.*)/)?.[1];
                const time = art.match(/TIME:\s*(.*)/)?.[1];
                const snippet = art.match(/SNIPPET:\s*(.*)/)?.[1];

                if (title && snippet) {
                    parsedNews.push({
                        title: title.trim(),
                        source: source?.trim() || "Market News",
                        time: time?.trim() || "Today",
                        snippet: snippet.trim()
                    });
                }
            });

            if (parsedNews.length > 0) {
                setNews(parsedNews);
            } else {
                // Fallback if parsing fails or no news found
                setNews([{
                    title: `Market Update: ${query}`,
                    source: "AI Analyst",
                    time: "Just now",
                    snippet: resultText.substring(0, 200) + "..."
                }]);
            }

        } catch (error) {
            console.error("Failed to fetch news", error);
            setNews([{
                title: "Error Fetching News",
                source: "System",
                time: "Now",
                snippet: "Could not retrieve real-time news. Please check your connection or API key."
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-12" data-aos="fade-down">
                    <Link href="/dashboard" className="flex items-center text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Global Market News
                    </h1>
                </div>

                {/* Search Section */}
                <div className="max-w-2xl mx-auto mb-16" data-aos="fade-up">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative flex items-center bg-[#111] border border-white/10 rounded-xl p-2">
                            <Search className="w-5 h-5 text-gray-400 ml-3" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Search for symbols (e.g., BTC, XAUUSD, TSLA)..."
                                className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-2 placeholder-gray-500"
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* News Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                        // Loading Skeletons
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
                        ))
                    ) : (
                        news.map((item, idx) => (
                            <div
                                key={idx}
                                data-aos="fade-up"
                                data-aos-delay={idx * 100}
                                className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-6 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium border border-blue-500/20">
                                        {item.source}
                                    </span>
                                    <span className="text-gray-500 text-xs">{item.time}</span>
                                </div>
                                <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-400 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                    {item.snippet}
                                </p>
                                <div className="flex items-center text-blue-400 text-sm font-medium cursor-pointer hover:underline">
                                    Read Full Story <ExternalLink className="w-3 h-3 ml-1" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
