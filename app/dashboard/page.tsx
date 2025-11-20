'use client';
// Force Re-deploy: 2025-11-20 23:53

import { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Upload, Key, Send, LogOut, History, Settings, Globe, Paperclip, Bot } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TradingSignalCard } from '@/components/ui/TradingSignalCard';

// Available Models
const AI_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
];

type Message = {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
};

export default function DashboardPage() {
    const [apiKey, setApiKey] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Settings
    const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
    const [enableNews, setEnableNews] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) router.push('/login');
        };
        checkUser();

        const savedKey = localStorage.getItem('openrouter_key');
        if (savedKey) setApiKey(savedKey);

        // Initial Welcome Message
        setMessages([{
            role: 'assistant',
            content: 'Hello! I am your AI Trading Copilot. Upload a chart or ask me anything about the market. I can also search for real-time news if you enable it.'
        }]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSendMessage = async () => {
        if ((!input.trim() && !image) || !apiKey) return alert('Please provide API Key and a message/image');

        setLoading(true);

        // 1. Prepare User Message
        let base64Image = null;
        if (image) {
            const reader = new FileReader();
            base64Image = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target?.result);
                reader.readAsDataURL(image);
            });
        }

        const newUserMsg: Message = {
            role: 'user',
            content: input || (image ? "Analyze this chart" : ""),
            image: preview || undefined
        };

        const newMessages = [...messages, newUserMsg];
        setMessages(newMessages);
        setInput('');
        setImage(null);
        setPreview(null);

        try {
            // 2. Call API
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })), // Send history
                    apiKey,
                    model: selectedModel,
                    enableNews,
                    image: base64Image // Send image only for this turn
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // 3. Add AI Response
            const aiMsg: Message = {
                role: 'assistant',
                content: data.result
            };
            setMessages(prev => [...prev, aiMsg]);

            // 4. Save to DB (Log only the analysis part)
            if (data.result.includes('SIGNAL')) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('analysis_logs').insert({
                        user_id: user.id,
                        pair_name: 'Chat Analysis',
                        signal: data.result.includes('BUY') ? 'BUY' : data.result.includes('SELL') ? 'SELL' : 'INFO',
                        analysis_result: data.result
                    });
                }
            }

        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Risk Calculator State
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcBalance, setCalcBalance] = useState(1000);
    const [calcRisk, setCalcRisk] = useState(1); // 1%
    const [calcSL, setCalcSL] = useState(50); // 50 pips
    const [calcResult, setCalcResult] = useState<string | null>(null);

    const calculateLot = () => {
        // Simple Forex Formula: RiskAmount / (SL * PipValue)
        // Assuming Standard Lot ($10/pip)
        const riskAmount = calcBalance * (calcRisk / 100);
        const lotSize = riskAmount / (calcSL * 10);
        setCalcResult(`${lotSize.toFixed(2)} Lots (Risk: $${riskAmount.toFixed(2)})`);
    };

    return (
        <div className="min-h-screen p-4 md:p-6 pb-20 flex flex-col h-screen relative">
            {/* Header */}
            <header className="flex justify-between items-center mb-4 shrink-0">
                <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    <Bot className="text-emerald-400" /> AI Trading Copilot
                </h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCalculator(true)}
                        className="hidden md:flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                        💰 Risk Calc
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Settings size={20} />
                    </button>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-red-400">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Sidebar (Settings) */}
                <div className={`${showSettings ? 'block' : 'hidden'} md:block w-full md:w-80 shrink-0 space-y-4 overflow-y-auto`}>
                    <GlassCard className="p-5 space-y-4">
                        <h3 className="font-semibold text-white border-b border-white/10 pb-2">Configuration</h3>

                        {/* API Key */}
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">OpenRouter API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                    placeholder="sk-or-..."
                                />
                                <button onClick={() => localStorage.setItem('openrouter_key', apiKey)} className="bg-white/10 px-2 rounded text-xs hover:bg-white/20">Save</button>
                            </div>
                        </div>

                        {/* Model Selection */}
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">AI Model</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded px-2 py-2 text-sm text-white outline-none focus:border-emerald-500"
                            >
                                {AI_MODELS.map(m => (
                                    <option key={m.id} value={m.id} className="bg-gray-900">{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* News Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-300 flex items-center gap-2">
                                <Globe size={14} className="text-blue-400" /> Web Search (News)
                            </label>
                            <button
                                onClick={() => setEnableNews(!enableNews)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${enableNews ? 'bg-emerald-500' : 'bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enableNews ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                    </GlassCard>

                    {/* Navigation Links */}
                    <GlassCard className="p-2">
                        <button
                            onClick={() => router.push('/journal')}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors text-left"
                        >
                            <History size={18} className="text-purple-400" />
                            <span>My Trading Journal</span>
                        </button>
                        <button
                            onClick={() => setShowCalculator(true)}
                            className="w-full flex md:hidden items-center gap-3 p-3 hover:bg-white/5 rounded-lg text-gray-300 hover:text-white transition-colors text-left"
                        >
                            <span className="text-lg">💰</span>
                            <span>Risk Calculator</span>
                        </button>
                    </GlassCard>
                </div>

                {/* Chat Area */}
                <GlassCard className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user'
                                    ? 'bg-emerald-600/20 border border-emerald-500/30 text-white'
                                    : 'bg-white/5 border border-white/10 text-gray-200'
                                    }`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="Uploaded chart" className="max-w-full rounded-lg mb-3 border border-white/10" />
                                    )}

                                    {/* Check if message is a signal and render Card, otherwise render text */}
                                    {msg.role === 'assistant' && msg.content.includes('SIGNAL') ? (
                                        <TradingSignalCard content={msg.content} />
                                    ) : (
                                        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                                            {msg.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100" />
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        {preview && (
                            <div className="mb-2 relative inline-block">
                                <img src={preview} alt="Preview" className="h-16 rounded border border-white/20" />
                                <button
                                    onClick={() => { setImage(null); setPreview(null); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <label className="cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors">
                                <Paperclip size={20} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask about the market or upload a chart..."
                                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 text-white focus:border-emerald-500 outline-none"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={loading || (!input && !image)}
                                className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Risk Calculator Modal */}
            {showCalculator && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <GlassCard className="w-full max-w-sm p-6 relative">
                        <button
                            onClick={() => setShowCalculator(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ×
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            💰 Risk Calculator
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400">Account Balance ($)</label>
                                <input
                                    type="number"
                                    value={calcBalance}
                                    onChange={(e) => setCalcBalance(Number(e.target.value))}
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Risk Percentage (%)</label>
                                <input
                                    type="number"
                                    value={calcRisk}
                                    onChange={(e) => setCalcRisk(Number(e.target.value))}
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Stop Loss (Pips)</label>
                                <input
                                    type="number"
                                    value={calcSL}
                                    onChange={(e) => setCalcSL(Number(e.target.value))}
                                    className="w-full bg-black/30 border border-white/10 rounded p-2 text-white"
                                />
                            </div>

                            <button
                                onClick={calculateLot}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded transition-colors"
                            >
                                Calculate
                            </button>

                            {calcResult && (
                                <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded text-center">
                                    <p className="text-xs text-emerald-300 uppercase font-bold">Recommended Position</p>
                                    <p className="text-xl font-bold text-white">{calcResult}</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
}
