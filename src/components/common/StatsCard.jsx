import React from 'react';

export default function StatsCard({ icon: Icon, label, value, description, color = 'primary' }) {
  const colorClasses = {
    primary: { border: 'border-primary-500', bg: 'bg-primary-50', text: 'text-primary-600' },
    emerald: { border: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-600' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  };

  const theme = colorClasses[color] || colorClasses.primary;

  return (
    <div className={`card p-4 sm:p-6 border-l-4 ${theme.border}`}>
      <div className="flex items-center justify-between mb-3 gap-4">
        <div className={`w-12 h-12 flex items-center justify-center ${theme.bg} rounded-xl flex-shrink-0`}>
          <Icon className={`${theme.text}`} size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">{value}</h3>
          {description && <p className="text-sm text-slate-500 mt-1 truncate">{description}</p>}
        </div>
      </div>
    </div>
  );
}
