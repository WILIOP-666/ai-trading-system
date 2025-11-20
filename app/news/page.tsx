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
            // We'll use our existing API to fetch news context
            // In a real app, we might want a dedicated news endpoint, but this works for now
            // by piggybacking on the analyze route or we can simulate it for the UI demo
            // For this demo, I will simulate a rich news response since our backend 
            // returns a string summary. 

            // Simulating API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock Data for UI Showcase (since backend returns plain text summary)
            // In production, we would parse the backend response or use a real news API.
            const mockNews = [
                {
                    title: `${query} Analysis: Bullish Momentum Continues`,
                    source: "Bloomberg",
                    time: "2 hours ago",
                    snippet: "Markets are showing strong signs of recovery as institutional investors increase their positions..."
                },
                {
                    title: "Central Bank Policy Shift Impacts Trading Volumes",
                    source: "Reuters",
                    time: "4 hours ago",
                    snippet: "The latest announcement from the Fed has caused a ripple effect across major currency pairs..."
                },
                {
                    title: "Top 5 Altcoins to Watch This Week",
                    source: "CoinDesk",
                    time: "5 hours ago",
                    snippet: "With Bitcoin stabilizing, these alternative cryptocurrencies are showing potential for breakout..."
                },
                {
                    title: "Gold Prices Hit New Highs Amidst Geopolitical Tension",
                    source: "Investing.com",
                    time: "12 hours ago",
                    snippet: "Safe-haven assets are in high demand as global uncertainties rise, pushing XAU/USD to new levels..."
                }
            ];
            setNews(mockNews);
        } catch (error) {
            console.error("Failed to fetch news", error);
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
