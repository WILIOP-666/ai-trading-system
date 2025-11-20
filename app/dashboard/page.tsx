'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Upload, Key, Play, LogOut, History } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const [apiKey, setApiKey] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const initDashboard = async () => {
            // Check auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Load history
            const { data: logs } = await supabase
                .from('analysis_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            if (logs) setHistory(logs);
        };

        initDashboard();

        // Load saved API key
        const savedKey = localStorage.getItem('openrouter_key');
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleSaveKey = () => {
        localStorage.setItem('openrouter_key', apiKey);
        alert('API Key saved securely in your browser!');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleAnalyze = async () => {
        if (!apiKey || !image) return alert('Please provide API Key and Image');

        setLoading(true);
        setAnalysis(null);

        try {
            // Convert image to base64
            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onload = async () => {
                const base64Image = reader.result as string;

                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Image,
                        apiKey: apiKey
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error);

                setAnalysis(data.result);

                // Save to Database (Real History)
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: newLog } = await supabase.from('analysis_logs').insert({
                        user_id: user.id,
                        pair_name: 'Unknown', // Placeholder for now
                        signal: data.result.includes('BUY') ? 'BUY' : data.result.includes('SELL') ? 'SELL' : 'WAIT',
                        analysis_result: data.result
                    }).select().single();

                    if (newLog) {
                        setHistory(prev => [newLog, ...prev].slice(0, 5));
                    }
                }
            };
        } catch (err: any) {
            alert('Analysis failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen p-6 pb-20">
            {/* Header */}
            <header className="flex justify-between items-center mb-10">
                <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
                <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors">
                    <LogOut size={18} /> Logout
                </button>
            </header>

            <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {/* Left Column: Controls */}
                <div className="space-y-6">
                    {/* API Key Section */}
                    <GlassCard className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Key className="text-emerald-400" size={20} /> API Configuration
                        </h2>
                        <div className="space-y-3">
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-or-..."
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                            />
                            <button
                                onClick={handleSaveKey}
                                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 text-sm py-2 rounded-lg transition-colors"
                            >
                                Save Key Locally
                            </button>
                        </div>
                    </GlassCard>

                    {/* News Section */}
                    <GlassCard className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="text-yellow-400">📰</span> Market Context
                        </h2>
                        <div className="text-xs text-gray-400 space-y-2">
                            <p>• <span className="text-white">USD</span>: Fed hints rate cuts.</p>
                            <p>• <span className="text-white">EUR</span>: ECB hawkish stance.</p>
                            <p>• <span className="text-white">BTC</span>: ETF inflows record high.</p>
                            <p>• <span className="text-white">GOLD</span>: Safe-haven demand up.</p>
                        </div>
                    </GlassCard>

                    {/* Upload Section */}
                    <GlassCard className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Upload className="text-blue-400" size={20} /> Chart Upload
                        </h2>
                        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {preview ? (
                                <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                            ) : (
                                <div className="text-gray-500">
                                    <p>Drag & drop or click to upload</p>
                                    <p className="text-xs mt-2">Supports PNG, JPG</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !image || !apiKey}
                            className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Analyzing...' : (
                                <>
                                    <Play size={18} /> Analyze Chart
                                </>
                            )}
                        </button>
                    </GlassCard>
                </div>

                {/* Right Column: Analysis Results */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="min-h-[400px] p-8">
                        <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">AI Analysis Result</h2>

                        {analysis ? (
                            <div className="prose prose-invert max-w-none">
                                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                                    {analysis}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 py-20">
                                <div className="w-16 h-16 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin mb-4" style={{ animationDuration: '3s' }}></div>
                                <p>Waiting for chart data...</p>
                            </div>
                        )}
                    </GlassCard>

                    {/* History Section */}
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <History className="text-purple-400" size={20} /> Recent Analysis
                        </h3>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-gray-500 text-sm">No history found.</p>
                            ) : (
                                history.map((log) => (
                                    <div key={log.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                        <div>
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${log.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                                                    log.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {log.signal}
                                            </span>
                                            <span className="text-gray-400 text-xs ml-2">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <button className="text-xs text-blue-400 hover:text-blue-300">View</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
