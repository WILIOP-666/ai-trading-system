import React from 'react';
import { TrendingUp, TrendingDown, Target, Shield, Activity, BarChart2 } from 'lucide-react';

interface TradingSignalCardProps {
    content: string;
}

export const TradingSignalCard: React.FC<TradingSignalCardProps> = ({ content }) => {
    // Helper to extract value safely
    const extract = (key: string) => {
        const regex = new RegExp(`\\*\\*${key}\\*\\*:\\s*(.*)`, 'i');
        const match = content.match(regex);
        return match ? match[1].trim() : null;
    };

    const signal = extract('SIGNAL');
    const pair = extract('PAIR');
    const timeframe = extract('TIMEFRAME');
    const entry = extract('ENTRY');
    const tp = extract('TAKE PROFIT');
    const sl = extract('STOP LOSS');
    const confidence = extract('CONFIDENCE');

    // Extract Reasoning (everything after REASONING:)
    const reasoningParts = content.split('**REASONING**:');
    const reasoning = reasoningParts.length > 1 ? reasoningParts[1].trim() : '';

    // If not a valid signal format, return null (caller should render plain text)
    if (!signal || !pair) return null;

    const isBuy = signal.toUpperCase().includes('BUY');
    const isSell = signal.toUpperCase().includes('SELL');
    const colorClass = isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-gray-400';
    const bgClass = isBuy ? 'bg-emerald-500/10 border-emerald-500/30' : isSell ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-500/10 border-gray-500/30';

    return (
        <div className={`rounded-xl border ${bgClass} p-4 my-2 w-full max-w-2xl`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isBuy ? 'bg-emerald-500/20' : isSell ? 'bg-red-500/20' : 'bg-gray-500/20'}`}>
                        {isBuy ? <TrendingUp className={colorClass} size={24} /> : <TrendingDown className={colorClass} size={24} />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{pair}</h3>
                        <span className="text-xs text-gray-400">{timeframe} • {new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-xl font-black ${colorClass}`}>{signal}</div>
                    <div className="text-xs text-gray-400">Confidence: <span className="text-white">{confidence}</span></div>
                </div>
            </div>

            {/* Key Levels Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Activity size={12} /> ENTRY
                    </div>
                    <div className="font-mono font-bold text-blue-300">{entry}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Target size={12} /> TAKE PROFIT
                    </div>
                    <div className="font-mono font-bold text-emerald-300">{tp}</div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-center">
                    <div className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Shield size={12} /> STOP LOSS
                    </div>
                    <div className="font-mono font-bold text-red-300">{sl}</div>
                </div>
            </div>

            {/* Reasoning / Analysis */}
            {reasoning && (
                <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                    <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-2">
                        <BarChart2 size={14} /> AI ANALYSIS
                    </h4>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {reasoning}
                    </p>
                </div>
            )}
        </div>
    );
};
