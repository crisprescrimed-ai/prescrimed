import React from 'react';

export function TableContainer({ title, actions, emptyMessage, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
      {(title || actions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          {title && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1">{title}</h2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-2 md:px-0">
        {children}
      </div>
      {emptyMessage && (
        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">{emptyMessage}</div>
      )}
    </div>
  );
}

export function MobileGrid({ children }) {
  return <div className="md:hidden space-y-3 p-2">{children}</div>;
}

export function MobileCard({ children }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      {children}
    </div>
  );
}

export function TableWrapper({ children }) {
  return (
    <div className="overflow-x-auto -mx-2 md:mx-0 px-2 md:px-0">
      <table className="min-w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ columns }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800">
      <tr>
        {columns.map((col, idx) => (
          <th
            key={idx}
            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">{children}</tbody>;
}

export function Tr({ children }) {
  return <tr>{children}</tr>;
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-200 ${className} whitespace-normal md:whitespace-nowrap`}> 
      {children}
    </td>
  );
}
