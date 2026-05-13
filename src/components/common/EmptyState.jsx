import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon size={32} className="text-slate-300" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h3>
      <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm sm:text-base">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <button onClick={onAction} className="btn btn-primary">
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
