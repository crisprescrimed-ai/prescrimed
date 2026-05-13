import React from 'react';

export default function PageHeader({ title, subtitle, label, children }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <div className="space-y-3 min-w-0 flex-1">
        {label && (
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{label}</p>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-slate-500 text-sm max-w-2xl truncate">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-end w-full lg:w-auto gap-2 sm:gap-3 flex-shrink-0">
        {children}
      </div>
    </div>
  );
}
