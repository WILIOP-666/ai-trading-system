'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Upload, Key, Play, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const [apiKey, setApiKey] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        // Check auth
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) router.push('/login');
        };
        checkUser();

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
                <div className="lg:col-span-2">
                    <GlassCard className="h-full min-h-[500px] p-8">
                        <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">AI Analysis Result</h2>

                        {analysis ? (
                            <div className="prose prose-invert max-w-none">
                                <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                                    {analysis}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                <div className="w-16 h-16 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin mb-4" style={{ animationDuration: '3s' }}></div>
                                <p>Waiting for chart data...</p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
