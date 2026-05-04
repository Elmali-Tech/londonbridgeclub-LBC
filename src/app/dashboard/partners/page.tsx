'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Partner } from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import DashboardContainer from '@/app/components/dashboard/DashboardContainer';

export default function PartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('grid');

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      setPartners(data || []);
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPartners = partners.filter(partner => {
    const searchLower = searchTerm.toLowerCase();
    return (
      partner.name.toLowerCase().includes(searchLower) ||
      (partner.description && partner.description.toLowerCase().includes(searchLower))
    );
  });

  return (
    <DashboardContainer user={user}>
      {/* Header */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Our Partners</h1>
            <p className="text-gray-600 mt-1">Explore our valued partners and collaborators</p>
        </div>

          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-sm bg-gray-50 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                  viewMode === 'card'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-sm flex justify-between">
          <div className="text-sm">
            <span className="text-gray-600">Showing: </span>
            <span className="text-black font-medium">{filteredPartners.length}</span>
            <span className="text-gray-600"> partners</span>
            {searchTerm && (
              <span className="text-gray-600"> matching &quot;{searchTerm}&quot;</span>
            )}
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Total: </span>
            <span className="text-black font-medium">{partners.length}</span>
            <span className="text-gray-600"> partners</span>
          </div>
        </div>
      </div>

      {/* Partners Display */}
      <div className="bg-white rounded-sm border border-gray-200 shadow-lg p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No partners found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'No partners match your search criteria.'
                : 'Partners will be displayed here once they are added.'
              }
            </p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-sm text-sm font-medium transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map((partner) => (
                  <div key={partner.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-200">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center mb-5 border border-gray-100 bg-gray-50/50 shadow-sm flex-shrink-0 relative">
                      {partner.logo_key ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com`}/${partner.logo_key}`}
                          alt={partner.name}
                          className="max-w-[85%] max-h-[85%] object-contain"
                        />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400/10 to-amber-600/10 text-amber-700 font-bold text-3xl">
                          {partner.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                      <h3 className="text-lg font-semibold text-black mb-2 line-clamp-1">{partner.name}</h3>
                      {partner.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{partner.description}</p>
                      )}
                      
                      {partner.website_url && (
                        <a
                          href={partner.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-amber-600 hover:text-amber-700 transition-colors text-sm font-medium"
                        >
                          <span className="mr-1">Visit Website</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Card View */
              <div className="space-y-6">
                {filteredPartners.map((partner) => (
                  <div key={partner.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300 hover:border-amber-200">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="w-28 h-28 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100 bg-gray-50/50 shadow-sm relative">
                        {partner.logo_key ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_AWS_S3_URL || `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || 'londonbridgeprojt'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1'}.amazonaws.com`}/${partner.logo_key}`}
                            alt={partner.name}
                            className="max-w-[85%] max-h-[85%] object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400/10 to-amber-600/10 text-amber-700 font-bold text-4xl">
                            {partner.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-black mb-2">{partner.name}</h3>
                        {partner.description && (
                          <p className="text-gray-600 mb-4">{partner.description}</p>
                        )}
                        
                        {partner.website_url && (
                          <a
                            href={partner.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-amber-600 hover:text-amber-700 transition-colors font-medium"
                          >
                            <span className="mr-2">Visit Website</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}
      </div>
    </DashboardContainer>
  );
} 