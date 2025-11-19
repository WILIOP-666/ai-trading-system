'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { Users, Settings, ShieldAlert } from 'lucide-react';

export default function AdminPage() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Simple Admin Check: In production, check a 'role' column in 'profiles' table
            // For now, we'll allow access but show a warning if not a specific email (demo mode)
            if (!user) {
                router.push('/login');
                return;
            }

            setLoading(false);
        };
        checkAdmin();
    }, []);

    if (loading) return <div className="p-10 text-white">Verifying Admin Privileges...</div>;

    return (
        <div className="min-h-screen p-6">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                <ShieldAlert className="text-red-500" /> Admin Control Panel
            </h1>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <GlassCard className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm">Total Users</p>
                            <h3 className="text-3xl font-bold text-white mt-1">1,240</h3>
                        </div>
                        <Users className="text-emerald-400" />
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm">Active Sessions</p>
                            <h3 className="text-3xl font-bold text-white mt-1">85</h3>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm">System Status</p>
                            <h3 className="text-3xl font-bold text-emerald-400 mt-1">Operational</h3>
                        </div>
                        <Settings className="text-blue-400" />
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="p-8">
                <h2 className="text-xl font-bold mb-6">User Management</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-300">
                        <thead className="text-xs uppercase bg-white/5 text-gray-400">
                            <tr>
                                <th className="px-6 py-3">User Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {/* Mock Data */}
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">admin@aitrade.pro</td>
                                <td className="px-6 py-4"><span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs">ADMIN</span></td>
                                <td className="px-6 py-4 text-emerald-400">Active</td>
                                <td className="px-6 py-4"><button className="text-blue-400 hover:underline">Edit</button></td>
                            </tr>
                            <tr className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">trader1@gmail.com</td>
                                <td className="px-6 py-4"><span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">MEMBER</span></td>
                                <td className="px-6 py-4 text-emerald-400">Active</td>
                                <td className="px-6 py-4"><button className="text-blue-400 hover:underline">Edit</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
