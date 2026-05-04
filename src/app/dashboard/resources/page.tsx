'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';

// Example resources data
const resources = [
  {
    id: 1,
    title: 'Business Plan Template 2024',
    description: 'Comprehensive business plan template with financial projections and market analysis sections.',
    category: 'templates',
    type: 'PDF',
    size: '2.5 MB',
    downloads: 245,
    featured: true,
    dateAdded: '2023-12-01'
  },
  {
    id: 2,
    title: 'Networking Best Practices Guide',
    description: 'Essential guide on effective networking strategies for business professionals and entrepreneurs.',
    category: 'guides',
    type: 'PDF',
    size: '1.2 MB',
    downloads: 189,
    featured: false,
    dateAdded: '2023-11-28'
  },
  {
    id: 3,
    title: 'Financial Modeling Course',
    description: 'Complete video course on financial modeling for startups and established businesses.',
    category: 'courses',
    type: 'Video',
    size: '850 MB',
    downloads: 127,
    featured: true,
    dateAdded: '2023-11-25'
  },
  {
    id: 4,
    title: 'Legal Contract Templates',
    description: 'Collection of essential legal contracts including NDAs, service agreements, and employment contracts.',
    category: 'templates',
    type: 'ZIP',
    size: '5.1 MB',
    downloads: 312,
    featured: false,
    dateAdded: '2023-11-20'
  },
  {
    id: 5,
    title: 'Market Research Toolkit',
    description: 'Tools and templates for conducting comprehensive market research and competitor analysis.',
    category: 'tools',
    type: 'Excel',
    size: '3.8 MB',
    downloads: 156,
    featured: false,
    dateAdded: '2023-11-15'
  },
  {
    id: 6,
    title: 'Leadership Development Webinar Series',
    description: 'Recorded webinar series featuring top executives sharing leadership insights and strategies.',
    category: 'webinars',
    type: 'Video',
    size: '1.2 GB',
    downloads: 98,
    featured: true,
    dateAdded: '2023-11-10'
  },
  {
    id: 7,
    title: 'Digital Marketing Checklist',
    description: 'Complete checklist for launching and optimizing digital marketing campaigns.',
    category: 'checklists',
    type: 'PDF',
    size: '890 KB',
    downloads: 203,
    featured: false,
    dateAdded: '2023-11-05'
  },
  {
    id: 8,
    title: 'Investment Pitch Deck Template',
    description: 'Professional pitch deck template used by successful startups to raise funding.',
    category: 'templates',
    type: 'PowerPoint',
    size: '4.2 MB',
    downloads: 278,
    featured: true,
    dateAdded: '2023-11-01'
  }
];

export default function ResourcesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || resource.category === categoryFilter;
    const matchesType = !typeFilter || resource.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      templates: 'bg-blue-100 text-blue-800 border-blue-200',
      guides: 'bg-green-100 text-green-800 border-green-200',
      courses: 'bg-purple-100 text-purple-800 border-purple-200',
      tools: 'bg-orange-100 text-orange-800 border-orange-200',
      webinars: 'bg-pink-100 text-pink-800 border-pink-200',
      checklists: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
      case 'Video':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 3a1 1 0 011-1h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3a1 1 0 000 2zm13 15.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" />
          </svg>
        );
      case 'Excel':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
          </svg>
        );
      case 'PowerPoint':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <DashboardContainer user={user}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Resource Library</h1>
            <p className="text-gray-600 mt-1">Access valuable business resources, templates, and learning materials</p>
          </div>
          
          <button className="px-4 py-2 bg-amber-600 text-white rounded-sm text-sm font-medium hover:bg-amber-700 transition-colors">
            Upload Resource
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">All Categories</option>
              <option value="templates">Templates</option>
              <option value="guides">Guides</option>
              <option value="courses">Courses</option>
              <option value="tools">Tools</option>
              <option value="webinars">Webinars</option>
              <option value="checklists">Checklists</option>
            </select>
            
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">All Types</option>
              <option value="PDF">PDF</option>
              <option value="Video">Video</option>
              <option value="Excel">Excel</option>
              <option value="PowerPoint">PowerPoint</option>
              <option value="ZIP">ZIP</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-sm flex justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Showing: </span>
            <span className="text-black font-medium">{filteredResources.length}</span>
            <span className="text-gray-600"> resources</span>
            {searchQuery && (
              <span className="text-gray-600"> matching &quot;{searchQuery}&quot;</span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Total: </span>
            <span className="text-black font-medium">{resources.length}</span>
            <span className="text-gray-600"> resources available</span>
          </div>
        </div>
      </div>
      
      {/* Resources Display */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        {filteredResources.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'No resources match your search criteria.'
                : 'No resources available at the moment.'
              }
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-sm font-medium transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map(resource => (
              <div 
                key={resource.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-200 relative"
              >
                {resource.featured && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    Featured
                  </div>
                )}
                
                <div className="flex items-start gap-3 mb-4">
                  {getTypeIcon(resource.type)}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-black mb-1 line-clamp-2">{resource.title}</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(resource.category)}`}>
                      {resource.category.charAt(0).toUpperCase() + resource.category.slice(1)}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{resource.description}</p>
                
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      {resource.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      {resource.downloads} downloads
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Download
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardContainer>
  );
} 