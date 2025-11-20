"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Send, Image as ImageIcon, Settings, Mic, PenTool,
    Brain, X, ChevronDown, Sparkles, Paperclip, Globe,
    LayoutDashboard, Newspaper, BarChart2, LogOut, User, Menu
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Supabase
import { createClient } from '@/lib/supabase';

// Components
import { TradingSignalCard } from '@/components/ui/TradingSignalCard';

// Types
type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
    image?: string;
};

type AIModel = {
    id: string;
    name: string;
};

export default function DashboardPage() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "Hello! I'm your Advanced AI Trading Copilot. \n\nI can analyze charts, scan for patterns, and provide institutional-grade setups. Upload a chart or ask me about the market!" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showTechMenu, setShowTechMenu] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Advanced Settings
    const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');
    const [availableModels, setAvailableModels] = useState<AIModel[]>([
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)' },
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
        { id: 'mistral/mistral-large', name: 'Mistral Large' },
    ]);

    const [systemPrompt, setSystemPrompt] = useState("You are a professional crypto & forex trader. Analyze charts with precision.");
    const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
    const [enableNews, setEnableNews] = useState(false);

    const [image, setImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    // Initialize AOS & Fetch Models
    useEffect(() => {
        AOS.init({ duration: 800, once: true });

        // Load API Key
        const storedKey = localStorage.getItem('openrouter_key');
        if (storedKey) setApiKey(storedKey);

        // Check Admin
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email === 'admin@aitrade.pro') setIsAdmin(true);
        };
        checkUser();

        // Fetch Dynamic Models from OpenRouter
        const fetchModels = async () => {
            try {
                const res = await fetch('https://openrouter.ai/api/v1/models');
                const data = await res.json();
                if (data.data) {
                    const models = data.data.map((m: any) => ({ id: m.id, name: m.name }));
                    setAvailableModels(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newModels = models.filter((m: any) => !existingIds.has(m.id));
                        return [...prev, ...newModels.slice(0, 20)];
                    });
                }
            } catch (e) {
                console.error("Failed to fetch models", e);
            }
        };
        fetchModels();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSaveSettings = () => {
        localStorage.setItem('openrouter_key', apiKey);
        setShowSettings(false);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const insertTechIndicator = (indicator: string) => {
        setInput(prev => `${prev} [Analyze ${indicator}]`);
        setShowTechMenu(false);
    };

    const handleSend = async () => {
        if ((!input.trim() && !image) || isLoading) return;

        const userMsg: Message = { role: 'user', content: input, image: image || undefined };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setImage(null);
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('analysis_logs').insert({
                    user_id: user.id,
                    image_url: image ? 'base64_image' : null,
                    analysis_result: input,
                    model_used: selectedModel
                });
            }

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg],
                    apiKey,
                    model: selectedModel,
                    enableNews,
                    systemPrompt: `${systemPrompt} (Reasoning Effort: ${reasoningEffort})`
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'assistant', content: data.result }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}. Please check your API Key in settings.` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="flex min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30 overflow-hidden">

            <aside className="w-20 lg:w-64 bg-[#111]/80 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between z-50 transition-all duration-300">
                <div>
                    <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight">AI Trade<span className="text-blue-400">Pro</span></span>
                    </div>

                    <nav className="mt-8 px-2 lg:px-4 space-y-2">
                        <button className="w-full flex items-center p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 transition-all group">
                            <LayoutDashboard className="w-5 h-5 lg:mr-3" />
                            <span className="hidden lg:block font-medium">Dashboard</span>
                        </button>

                        <Link href="/news" className="w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all group">
                            <Newspaper className="w-5 h-5 lg:mr-3 group-hover:scale-110 transition-transform" />
                            <span className="hidden lg:block font-medium">Market News</span>
                        </Link>

                        <button onClick={() => setShowTechMenu(!showTechMenu)} className="w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all group">
                            <BarChart2 className="w-5 h-5 lg:mr-3 group-hover:scale-110 transition-transform" />
                            <span className="hidden lg:block font-medium">Tech Analysis</span>
                        </button>

                        {isAdmin && (
                            <Link href="/admin" className="w-full flex items-center p-3 rounded-xl text-purple-400 hover:bg-purple-500/10 transition-all group">
                                <User className="w-5 h-5 lg:mr-3" />
                                <span className="hidden lg:block font-medium">Admin Panel</span>
                            </Link>
                        )}
                    </nav>
                </div>

                <div className="p-4 border-t border-white/5">
                    <button onClick={handleSignOut} className="w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all">
                        <LogOut className="w-5 h-5 lg:mr-3" />
                        <span className="hidden lg:block font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col relative h-screen overflow-hidden">

                <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md flex items-center justify-between px-6 z-40">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center bg-[#1a1a1a] rounded-full px-4 py-1.5 border border-white/10 hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => setShowSettings(true)}>
                            <Sparkles className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="text-sm font-medium text-gray-200 truncate max-w-[150px]">{availableModels.find(m => m.id === selectedModel)?.name || 'Select Model'}</span>
                            <ChevronDown className="w-3 h-3 text-gray-500 ml-2" />
                        </div>

                        <button
                            onClick={() => setEnableNews(!enableNews)}
                            className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${enableNews ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-[#1a1a1a] border-white/10 text-gray-400'}`}
                        >
                            <Globe className="w-3 h-3 mr-1.5" />
                            {enableNews ? 'Web Search ON' : 'Web Search OFF'}
                        </button>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                            AD
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            data-aos="fade-up"
                            data-aos-delay="50"
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl p-5 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : 'bg-[#1a1a1a] border border-white/5 text-gray-200 shadow-xl'
                                }`}>
                                {msg.image && (
                                    <img src={msg.image} alt="Analysis" className="max-w-full h-auto rounded-lg mb-4 border border-white/10" />
                                )}

                                {msg.content.includes('SIGNAL') ? (
                                    <TradingSignalCard content={msg.content} />
                                ) : (
                                    <ReactMarkdown
                                        className="prose prose-invert prose-sm max-w-none"
                                        components={{
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                            strong: ({ node, ...props }) => <span className="font-bold text-blue-300" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                            li: ({ node, ...props }) => <li className="text-gray-300" {...props} />
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 lg:p-6 bg-[#0a0a0a] border-t border-white/5 relative z-40">
                    {showTechMenu && (
                        <div className="absolute bottom-full left-6 mb-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 w-64 grid grid-cols-2 gap-2" data-aos="fade-up">
                            {['RSI Divergence', 'MACD Crossover', 'Fibonacci Levels', 'Elliott Wave', 'Bollinger Bands', 'Volume Profile'].map((tech) => (
                                <button
                                    key={tech}
                                    onClick={() => insertTechIndicator(tech)}
                                    className="text-xs text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 hover:text-blue-400 transition-colors"
                                >
                                    {tech}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-75 pointer-events-none"></div>
                        <div className="relative bg-[#111] rounded-2xl border border-white/10 flex flex-col shadow-2xl">

                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Settings"
                                    >
                                        <Settings className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Upload Chart"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setShowTechMenu(!showTechMenu)}
                                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors" title="Technical Tools"
                                    >
                                        <PenTool className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="text-xs text-gray-600 font-mono">
                                    {messages.length} msgs • Memory Active
                                </div>
                            </div>

                            <div className="flex items-end p-2">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Ask about any market, upload a chart, or request a signal..."
                                    className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none max-h-48 py-3 px-3 min-h-[60px]"
                                    rows={1}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={isLoading || (!input.trim() && !image)}
                                    className="mb-2 mr-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>

                            {image && (
                                <div className="absolute bottom-full left-0 mb-4 ml-4">
                                    <div className="relative group">
                                        <img src={image} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-white/20 shadow-xl" />
                                        <button
                                            onClick={() => setImage(null)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-center mt-3 text-xs text-gray-600">
                        AI can make mistakes. Always verify trading signals.
                    </div>
                </div>
            </main>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

            {showSettings && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" data-aos="zoom-in">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold flex items-center">
                                <Settings className="w-5 h-5 mr-2 text-blue-400" />
                                AI Configuration
                            </h2>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">OpenRouter API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-or-..."
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">Key is stored locally in your browser.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">AI Model</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableModels.map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setSelectedModel(m.id)}
                                            className={`text-left px-4 py-3 rounded-xl border transition-all ${selectedModel === m.id
                                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                    : 'bg-[#0a0a0a] border-white/10 text-gray-300 hover:border-white/30'
                                                }`}
                                        >
                                            <div className="font-medium truncate">{m.name}</div>
                                            <div className="text-xs opacity-60 truncate">{m.id}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">System Persona (Prompt)</label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[100px]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Reasoning Effort</label>
                                <div className="flex space-x-4 bg-[#0a0a0a] p-1 rounded-xl border border-white/10">
                                    {['low', 'medium', 'high'].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setReasoningEffort(level as any)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${reasoningEffort === level
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/10 bg-[#0a0a0a]/50 flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                className="bg-white text-black px-6 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
