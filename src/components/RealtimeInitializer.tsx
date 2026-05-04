'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, initializeRealtime, checkSupabaseConnection } from '@/lib/supabase';

export default function RealtimeInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    let connectionChecked = false;

    const initializeConnection = async () => {
      if (connectionChecked) return;
      connectionChecked = true;

      try {
        // Check if Supabase connection is working
        const isConnected = await checkSupabaseConnection();
        
        if (isConnected) {
          console.log('Supabase connection established');
          
          // Initialize realtime connection
          initializeRealtime();
          
          // Log realtime status
          if (supabase.realtime) {
            console.log('Realtime connection status:', supabase.realtime.isConnected());
          }
        } else {
          console.error('Failed to establish Supabase connection');
        }
      } catch (error) {
        console.error('Error initializing Supabase connection:', error);
      }
    };

    // Initialize connection when component mounts
    initializeConnection();

    // Cleanup on unmount
    return () => {
      if (supabase.realtime) {
        supabase.realtime.disconnect();
      }
    };
  }, []);

  // Re-initialize when user changes
  useEffect(() => {
    if (user && supabase.realtime && !supabase.realtime.isConnected()) {
      console.log('User changed, reinitializing realtime connection');
      initializeRealtime();
    }
  }, [user]);

  // This component doesn't render anything
  return null;
} 