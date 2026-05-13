import React from 'react';

const VARIANT_GRADIENT = {
  primary: 'from-primary-500 to-primary-600',
  danger: 'from-red-500 to-red-600',
  emerald: 'from-emerald-500 to-emerald-600'
};

export default function ActionIconButton({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon: Icon,
  iconSize = 18,
  tooltip,
  title,
  ariaLabel,
  className = '',
  tooltipClassName = ''
}) {
  const gradient = VARIANT_GRADIENT[variant] || VARIANT_GRADIENT.primary;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        `group relative p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br ${gradient} ` +
        'rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ' +
        `disabled:opacity-50 disabled:cursor-not-allowed ${className}`
      }
      title={title || tooltip}
      aria-label={ariaLabel || tooltip}
      type="button"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-[18px] w-[18px] border-2 border-white border-t-transparent"></div>
      ) : Icon ? (
        <Icon size={iconSize} />
      ) : null}

      {tooltip ? (
        <span
          className={
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium ' +
            'text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity ' +
            `pointer-events-none whitespace-nowrap z-10 ${tooltipClassName}`
          }
        >
          {tooltip}
        </span>
      ) : null}
    </button>
  );
}
