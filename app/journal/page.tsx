'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function JournalPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchLogs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            const { data } = await supabase
                .from('analysis_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setLogs(data);
            setLoading(false);
        };
        fetchLogs();
    }, []);

    return (
        <div className="min-h-screen p-6 pb-20">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="text-white" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">My Trading Journal</h1>
                </div>

                <GlassCard className="p-8">
                    {loading ? (
                        <div className="text-center text-gray-400 py-10">Loading journal...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">No trading history yet. Start analyzing charts!</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-300">
                                <thead className="text-xs uppercase bg-white/5 text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Pair</th>
                                        <th className="px-6 py-3">Signal</th>
                                        <th className="px-6 py-3">Analysis Preview</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-white">
                                                {log.pair_name || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-2 px-2 py-1 rounded text-xs w-fit font-bold ${log.signal === 'BUY' ? 'bg-green-500/20 text-green-400' :
                                                        log.signal === 'SELL' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {log.signal === 'BUY' && <TrendingUp size={14} />}
                                                    {log.signal === 'SELL' && <TrendingDown size={14} />}
                                                    {log.signal}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                                                {log.analysis_result}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">
                                                    Logged
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
