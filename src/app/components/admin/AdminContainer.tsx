import React from 'react';

interface AdminContainerProps {
  children: React.ReactNode;
}

export default function AdminContainer({ children }: AdminContainerProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {children}
    </div>
  );
} 