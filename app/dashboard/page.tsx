'use client';

import { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    Upload, Key, Send, LogOut, History, Settings, Globe, Paperclip, Bot,
    Mic, PenTool, Brain, X, ChevronDown, Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TradingSignalCard } from '@/components/ui/TradingSignalCard';

// Expanded Model List based on screenshot
const AI_MODELS = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
    { id: 'x-ai/grok-beta', name: 'Grok 4.1 Fast (Beta)' }, // Placeholder for Grok
    { id: 'openai/gpt-5-preview', name: 'GPT-5.1 Preview' }, // Placeholder
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

    // Advanced Settings State
    const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
    const [enableNews, setEnableNews] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [systemPrompt, setSystemPrompt] = useState("You are an expert AI Trading Assistant. Analyze charts, news, and market data to provide profitable trading signals with Entry, Stop Loss, and Take Profit levels.");
    const [reasoningEffort, setReasoningEffort] = useState('Medium');

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

        setMessages([{
            role: 'assistant',
            content: 'Hello! I am your AI Trading Copilot. Configure me in the settings or start chatting immediately.'
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
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    apiKey,
                    model: selectedModel,
                    enableNews,
                    systemPrompt, // Send custom system prompt
                    image: base64Image
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const aiMsg: Message = {
                role: 'assistant',
                content: data.result
            };
            setMessages(prev => [...prev, aiMsg]);

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
    const [calcRisk, setCalcRisk] = useState(1);
    const [calcSL, setCalcSL] = useState(50);
    const [calcResult, setCalcResult] = useState<string | null>(null);

    const calculateLot = () => {
        const riskAmount = calcBalance * (calcRisk / 100);
        const lotSize = riskAmount / (calcSL * 10);
        setCalcResult(`${lotSize.toFixed(2)} Lots (Risk: $${riskAmount.toFixed(2)})`);
    };

    return (
        <div className="min-h-screen p-4 md:p-6 pb-20 flex flex-col h-screen relative bg-[#0a0a0a] text-gray-100 font-sans">
            {/* Header */}
            <header className="flex justify-between items-center mb-4 shrink-0 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                        <Bot className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">AI Trading Copilot</h1>
                        <p className="text-xs text-gray-500">Powered by {AI_MODELS.find(m => m.id === selectedModel)?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowCalculator(true)} className="hidden md:flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg text-sm transition-colors border border-white/5">
                        💰 Risk Calc
                    </button>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-2">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden relative">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col overflow-hidden relative max-w-5xl mx-auto w-full">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] md:max-w-[80%] rounded-2xl p-5 ${msg.role === 'user'
                                        ? 'bg-emerald-600/20 border border-emerald-500/30 text-white'
                                        : 'bg-white/5 border border-white/10 text-gray-200'
                                    }`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="Uploaded chart" className="max-w-full rounded-lg mb-3 border border-white/10" />
                                    )}

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

                    {/* Advanced Input Area */}
                    <div className="p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-2 shadow-2xl">
                            {preview && (
                                <div className="px-4 pt-4 pb-2 relative inline-block">
                                    <img src={preview} alt="Preview" className="h-20 rounded-lg border border-white/20" />
                                    <button
                                        onClick={() => { setImage(null); setPreview(null); }}
                                        className="absolute top-2 right-0 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 backdrop-blur-sm transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Text Input */}
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Start a new message..."
                                className="w-full bg-transparent border-none text-white px-4 py-3 focus:ring-0 outline-none resize-none min-h-[50px] max-h-[200px]"
                                rows={1}
                            />

                            {/* Toolbar */}
                            <div className="flex items-center justify-between px-2 pb-1 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1">
                                    {/* Settings Trigger */}
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        title="Model Settings"
                                    >
                                        <Settings size={18} />
                                    </button>

                                    {/* Attachment */}
                                    <label className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                                        <Paperclip size={18} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>

                                    {/* Tools (Visual only for now) */}
                                    <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <PenTool size={18} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Mic size={18} />
                                    </button>

                                    <div className="w-px h-5 bg-white/10 mx-2" />

                                    {/* Web Search Toggle */}
                                    <button
                                        onClick={() => setEnableNews(!enableNews)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${enableNews
                                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        <Globe size={14} />
                                        <span>Search</span>
                                        <div className={`w-2 h-2 rounded-full ${enableNews ? 'bg-blue-400' : 'bg-gray-500'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Memory Indicator */}
                                    <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
                                        <Brain size={14} />
                                        <span>Memory ({messages.length})</span>
                                    </div>

                                    {/* Send Button */}
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={loading || (!input && !image)}
                                        className={`p-2 rounded-xl transition-all ${input || image
                                                ? 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121212] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1a1a1a]">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Sparkles className="text-emerald-400" size={18} /> Model Configuration
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* API Key */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">API Key</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Key className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                                            placeholder="sk-or-..."
                                        />
                                    </div>
                                    <button onClick={() => localStorage.setItem('openrouter_key', apiKey)} className="bg-white/10 px-4 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors">Save</button>
                                </div>
                            </div>

                            {/* Model Selection */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">AI Model</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {AI_MODELS.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModel(m.id)}
                                            className={`p-3 rounded-xl border text-left transition-all ${selectedModel === m.id
                                                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="font-medium text-sm">{m.name}</div>
                                            <div className="text-[10px] opacity-60">{m.id.split('/')[0]}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* System Prompt */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">System Prompt (Persona)</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-gray-300 focus:border-emerald-500 outline-none h-32 resize-none leading-relaxed"
                                />
                                <p className="text-[10px] text-gray-500 mt-2">Customize how the AI behaves. You can tell it to be a "Scalper", "Swing Trader", or "Risk Manager".</p>
                            </div>

                            {/* Reasoning Effort */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Reasoning Effort</label>
                                <div className="flex bg-black/30 p-1 rounded-lg border border-white/10 w-fit">
                                    {['Low', 'Medium', 'High'].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setReasoningEffort(level)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${reasoningEffort === level
                                                    ? 'bg-emerald-500 text-black shadow-lg'
                                                    : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10 bg-[#1a1a1a] flex justify-end">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Risk Calculator Modal (Keep existing) */}
            {showCalculator && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <GlassCard className="w-full max-w-sm p-6 relative">
                        <button onClick={() => setShowCalculator(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">×</button>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">💰 Risk Calculator</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400">Account Balance ($)</label>
                                <input type="number" value={calcBalance} onChange={(e) => setCalcBalance(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Risk Percentage (%)</label>
                                <input type="number" value={calcRisk} onChange={(e) => setCalcRisk(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Stop Loss (Pips)</label>
                                <input type="number" value={calcSL} onChange={(e) => setCalcSL(Number(e.target.value))} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white" />
                            </div>
                            <button onClick={calculateLot} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded transition-colors">Calculate</button>
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
