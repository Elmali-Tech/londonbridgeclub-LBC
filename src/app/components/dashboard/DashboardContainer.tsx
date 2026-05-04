'use client';

import React from 'react';
import { User } from '@/types/database';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

interface DashboardContainerProps {
  user: User | null;
  children: React.ReactNode;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  centerContent?: boolean;
}

export default function DashboardContainer({
  user,
  children,
  showLeftSidebar = true,
  showRightSidebar = true,
  maxWidth = '7xl',
  centerContent = false
}: DashboardContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full',
    '7xl': 'max-w-7xl'
  };

  const getMainContentWidth = () => {
    if (centerContent) {
      return 'max-w-4xl mx-auto';
    }
    if (showLeftSidebar && !showRightSidebar) {
      // With left sidebar but no right sidebar, content can expand more
      return 'lg:max-w-5xl';
    }
    if (showLeftSidebar && showRightSidebar) {
      // Default case with both sidebars
      return 'lg:max-w-2xl';
    }
    // For cases with no sidebars or only right sidebar (less common)
    return 'max-w-full';
  };

  return (
    <div className="min-h-screen">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto flex gap-4 lg:gap-6 pt-4 lg:pt-6 px-2 sm:px-4`}>
        {/* Left Sidebar - Desktop Only - Fixed */}
        {showLeftSidebar && (
          <div className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-20">
              <LeftSidebar user={user} />
            </div>
          </div>
        )}

        {/* Main Content Area - Scrollable */}
        <div className={`flex-1 space-y-4 ${getMainContentWidth()}`}>
          {children}
        </div>

        {/* Right Sidebar - Desktop Only - Fixed */}
        {showRightSidebar && (
          <div className="w-80 shrink-0 hidden xl:block">
            <div className="sticky top-20">
              <RightSidebar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 