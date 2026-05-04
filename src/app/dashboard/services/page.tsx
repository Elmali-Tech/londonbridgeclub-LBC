'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';

// Example services data
const services = [
  {
    id: 1,
    title: 'Business Consultation',
    description: 'Get expert advice on business strategy, growth planning, and operational efficiency from our experienced consultants.',
    category: 'consulting',
    price: '£150/hour',
    provider: 'LBC Consulting Team',
    features: ['Strategic Planning', 'Market Analysis', 'Growth Strategy', 'Risk Assessment'],
    isPopular: true
  },
  {
    id: 2,
    title: 'Legal Advisory',
    description: 'Professional legal services for business matters, contracts, compliance, and corporate law assistance.',
    category: 'legal',
    price: '£200/hour',
    provider: 'Partner Law Firm',
    features: ['Contract Review', 'Corporate Law', 'Compliance', 'Legal Documentation'],
    isPopular: false
  },
  {
    id: 3,
    title: 'Financial Planning',
    description: 'Comprehensive financial planning services including investment advice, tax planning, and wealth management.',
    category: 'finance',
    price: '£100/hour',
    provider: 'LBC Financial Advisors',
    features: ['Investment Planning', 'Tax Strategy', 'Wealth Management', 'Risk Management'],
    isPopular: true
  },
  {
    id: 4,
    title: 'Marketing & Branding',
    description: 'Professional marketing services to help grow your business including digital marketing, branding, and PR.',
    category: 'marketing',
    price: 'From £500/month',
    provider: 'Creative Partners',
    features: ['Digital Marketing', 'Brand Strategy', 'Social Media', 'PR Services'],
    isPopular: false
  },
  {
    id: 5,
    title: 'IT Support & Solutions',
    description: 'Comprehensive IT services including system setup, cybersecurity, cloud solutions, and technical support.',
    category: 'technology',
    price: '£80/hour',
    provider: 'Tech Solutions Ltd',
    features: ['System Setup', 'Cybersecurity', 'Cloud Migration', '24/7 Support'],
    isPopular: false
  },
  {
    id: 6,
    title: 'Executive Coaching',
    description: 'Individual development and leadership coaching for executives and senior managers.',
    category: 'development',
    price: '£120/session',
    provider: 'Leadership Academy',
    features: ['Leadership Skills', 'Individual Development', 'Performance Coaching', 'Goal Setting'],
    isPopular: true
  }
];

export default function ServicesPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filteredServices = services.filter(service => {
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      consulting: 'bg-blue-100 text-blue-800 border-blue-200',
      legal: 'bg-purple-100 text-purple-800 border-purple-200',
      finance: 'bg-green-100 text-green-800 border-green-200',
      marketing: 'bg-pink-100 text-pink-800 border-pink-200',
      technology: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      development: 'bg-amber-100 text-amber-800 border-amber-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <DashboardContainer user={user}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Professional Services</h1>
            <p className="text-gray-600 mt-1">Access expert services from trusted partners and professionals</p>
          </div>
          
          <button className="px-4 py-2 bg-amber-600 text-white rounded-sm text-sm font-medium hover:bg-amber-700 transition-colors">
            Request Custom Service
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="">All Categories</option>
            <option value="consulting">Business Consulting</option>
            <option value="legal">Legal Services</option>
            <option value="finance">Financial Services</option>
            <option value="marketing">Marketing & Branding</option>
            <option value="technology">Technology</option>
            <option value="development">Professional Development</option>
          </select>
        </div>

        {/* Stats */}
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-sm flex justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Showing: </span>
            <span className="text-black font-medium">{filteredServices.length}</span>
            <span className="text-gray-600"> services</span>
            {searchQuery && (
              <span className="text-gray-600"> matching &quot;{searchQuery}&quot;</span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Total: </span>
            <span className="text-black font-medium">{services.length}</span>
            <span className="text-gray-600"> services available</span>
          </div>
        </div>
      </div>
      
      {/* Services Display */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        {filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'No services match your search criteria.'
                : 'No services available at the moment.'
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
            {filteredServices.map(service => (
              <div 
                key={service.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-200 relative"
              >
                {service.isPopular && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    Popular
                  </div>
                )}
                
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-black mb-2">{service.title}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(service.category)}`}>
                    {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{service.description}</p>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">Provided by: <span className="font-medium text-gray-700">{service.provider}</span></p>
                  <p className="text-lg font-bold text-amber-600">{service.price}</p>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {service.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-center">
                        <svg className="w-3 h-3 mr-2 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors font-medium">
                    Book Now
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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