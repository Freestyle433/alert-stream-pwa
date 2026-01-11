import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const stats = [
  { key: 'total', label: 'Total Alerts', icon: Bell, color: 'from-cyan-500 to-blue-500' },
  { key: 'unread', label: 'Unread', icon: AlertTriangle, color: 'from-orange-500 to-red-500' },
  { key: 'read', label: 'Read', icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
  { key: 'today', label: 'Today', icon: Clock, color: 'from-purple-500 to-pink-500' }
];

export default function AlertStats({ data }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-5"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -translate-y-8 translate-x-8`} />
            
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-slate-400 text-sm">{stat.label}</span>
            </div>
            
            <p className="text-3xl font-bold text-white">
              {data[stat.key] || 0}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}