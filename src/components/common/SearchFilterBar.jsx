import React from 'react';
import { Search } from 'lucide-react';

export default function SearchFilterBar({ searchTerm, onSearchChange, placeholder, children }) {
  return (
    <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder={placeholder || "Buscar..."}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
        />
      </div>
      <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
        {children}
      </div>
    </div>
  );
}
