import React from 'react';

export default function SimpleChart({ data, color = '#2563eb', height = 200 }) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.count));
  const minVal = 0;
  const range = maxVal - minVal || 1; // Avoid division by zero

  // SVG Dimensions
  const width = 100; // 100%
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.count - minVal) / range) * 80; // Leave some padding at top (80% height usage)
    return `${x},${y}`;
  }).join(' ');

  // Area path (close the loop at the bottom)
  const areaPath = `${points} 100,100 0,100`;

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <div className="relative w-full h-full overflow-hidden">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Grid lines */}
          <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="60" x2="100" y2="60" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="#e2e8f0" strokeWidth="0.5" />

          {/* Area Fill */}
          <path
            d={`M${areaPath}Z`}
            fill={color}
            fillOpacity="0.1"
            stroke="none"
          />

          {/* Line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points (Hover effect could be added here with more complex logic) */}
          {data.map((d, i) => {
             const x = (i / (data.length - 1)) * 100;
             const y = 100 - ((d.count - minVal) / range) * 80;
             return (
               <circle
                 key={i}
                 cx={x}
                 cy={y}
                 r="1.5"
                 fill="white"
                 stroke={color}
                 strokeWidth="1"
                 vectorEffect="non-scaling-stroke"
                 className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
               >
                 <title>{`${new Date(d.date).toLocaleDateString('pt-BR')}: ${d.count} prescrições`}</title>
               </circle>
             );
          })}
        </svg>
        
        {/* X-Axis Labels (Simplified: Start, Middle, End) */}
        <div className="absolute bottom-0 left-0 w-full flex justify-between text-[10px] text-slate-400 pointer-events-none translate-y-4">
          <span>{new Date(data[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          <span>{new Date(data[Math.floor(data.length / 2)].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
          <span>{new Date(data[data.length - 1].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
