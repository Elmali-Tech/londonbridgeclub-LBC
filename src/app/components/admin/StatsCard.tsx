import React, { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  icon: ReactNode;
  color: "blue" | "green" | "purple" | "yellow" | "amber" | "indigo" | "red";
}

const colorClasses = {
  blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
  amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
  indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
  red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
};

export default function StatsCard({
  title,
  value,
  change,
  icon,
  color,
}: StatsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700">
      <div className="p-5">
        <div className="flex items-center">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl ${colorClasses[color]}`}
          >
            <span className="scale-[0.85]">{icon}</span>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              {title}
            </p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {value}
              </h3>
              {change && (
                <span
                  className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-md ${
                    change.neutral 
                      ? "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800" 
                      : change.positive
                      ? "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/30"
                      : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30"
                  }`}
                >
                  {!change.neutral && (change.positive ? "↑" : "↓")} {change.value}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
