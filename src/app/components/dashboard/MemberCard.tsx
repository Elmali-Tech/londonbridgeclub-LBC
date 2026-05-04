import React from 'react';
import { User } from '@/types/database';

interface MemberCardProps {
  member: User;
}

export default function MemberCard({ member }: MemberCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all hover:border-gray-300 group">
      {/* Card Header */}
      <div className="bg-white h-12"></div>
      
      {/* Card Content */}
      <div className="p-6 relative">
        {/* Profile Image */}
        <div className="absolute -top-8 left-6 w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center text-black font-bold text-xl shadow-md border-4 border-white group-hover:shadow-amber-600/20 transition-all">
          {member.full_name.split(' ').map(name => name[0]).join('')}
        </div>
        
        {/* Member Info */}
        <div className="ml-20 mt-2">
          <h2 className="font-semibold text-lg">{member.full_name}</h2>
          <p className="text-gray-400 text-sm mb-3">{member.email}</p>
          
          {/* Status Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
              member.status === 'corporate' 
                ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30' 
                : 'bg-green-900/30 text-green-400 border border-green-800/30'
            }`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                member.status === 'corporate' ? 'bg-blue-500' : 'bg-green-500'
              }`}></span>
              {member.status === 'corporate' ? 'Corporate Member' : 'Individual Member'}
            </div>
            
            {member.subscription_status === 'active' && (
              <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-800/30 flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Active Member
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
          <p className="text-gray-400 text-xs">
            Joined: {new Date(member.created_at).toLocaleDateString()}
          </p>
          
          {member.linkedin_url ? (
            <a 
              href={member.linkedin_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center group-hover:scale-105 transition-transform p-2 rounded-full hover:bg-blue-900/20"
              aria-label="LinkedIn Profile"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
              </svg>
            </a>
          ) : (
            <span className="text-gray-600 text-xs italic">No LinkedIn profile</span>
          )}
        </div>
      </div>
    </div>
  );
} 