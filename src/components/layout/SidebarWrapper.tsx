'use client';

import React from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { X } from 'lucide-react';

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <>
      {/* Overlay on Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
        
        {/* Close Button Mobile */}
        {isOpen && (
          <button 
            className="absolute top-4 -right-12 p-2 bg-white rounded-full text-gray-800 shadow-md md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
}
