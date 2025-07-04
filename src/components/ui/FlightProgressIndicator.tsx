
"use client";

import React from 'react';
import { Plane, Loader2 } from 'lucide-react'; // Using Plane for the icon
import { cn } from '@/lib/utils';

interface FlightProgressIndicatorProps {
  progress?: number; // Percentage 0-100 for determinate, undefined for indeterminate
  message?: string;
  className?: string;
}

export function FlightProgressIndicator({
  progress,
  message,
  className,
}: FlightProgressIndicatorProps) {
  const isDeterminate = typeof progress === 'number';

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-4 rounded-lg", "glass-card", className)}>
      <div className="w-full max-w-xs relative h-8 overflow-hidden">
        {/* Track */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-primary/20 rounded-full transform -translate-y-1/2"></div>
        
        {/* Plane Icon */}
        <div
          className={cn(
            "absolute top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-linear"
            // Removed: isDeterminate ? "" : "animate-flight-indeterminate" 
          )}
          style={isDeterminate ? { left: `calc(${Math.max(0, Math.min(100, progress!))}% - 12px)` } : { left: 'calc(50% - 12px)' }} 
        >
          {/* If not determinate, show Loader2 for animation, otherwise show Plane */}
          {!isDeterminate ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <Plane className="w-6 h-6 text-primary transform -rotate-45" />
          )}
        </div>
      </div>
      
      {message && <p className="text-sm text-center text-muted-foreground mt-2">{message}</p>}
      
      {/* 
        The <style jsx global> block has been removed.
        If the indeterminate animation is desired, these styles should be moved to globals.css:
        @keyframes flight-indeterminate-keyframes {
          0% { transform: translateX(-30px) translateY(-50%) rotate(-45deg) scale(0.9); opacity: 0.7; }
          50% { transform: translateX(30px) translateY(-50%) rotate(-45deg) scale(1.1); opacity: 1; }
          100% { transform: translateX(-30px) translateY(-50%) rotate(-45deg) scale(0.9); opacity: 0.7; }
        }
        .animate-flight-indeterminate > svg { // Or apply directly to the Plane icon's wrapper if it's always a specific div
          animation: flight-indeterminate-keyframes 2s ease-in-out infinite;
        }
      */}
    </div>
  );
}
