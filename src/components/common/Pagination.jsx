import React from 'react';

export default function Pagination({ page = 1, pageSize = 10, total = 0, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const goto = (p) => {
    if (!onPageChange) return;
    const next = Math.min(totalPages, Math.max(1, p));
    onPageChange(next);
  };

  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <div className="text-sm text-slate-600">
        Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-secondary"
          disabled={!canPrev}
          onClick={() => goto(page - 1)}
        >
          Anterior
        </button>
        <button
          className="btn btn-secondary"
          disabled={!canNext}
          onClick={() => goto(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
