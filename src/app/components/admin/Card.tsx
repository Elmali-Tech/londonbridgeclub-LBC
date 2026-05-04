import React, { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function Card({ title, children, className, action }: CardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 ${className || ''}`}>
      {title && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center">
          {typeof title === 'string' ? (
            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
          ) : (
            title
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}