
"use client";

import React from 'react';
import type { DailyPlanItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Route, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisualTimelineDisplayProps {
  dailyPlan: DailyPlanItem[];
}

const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";


export function VisualTimelineDisplay({ dailyPlan }: VisualTimelineDisplayProps) {
  if (!dailyPlan || dailyPlan.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No daily activities to display for this trip.
      </p>
    );
  }

  return (
    <div className="space-y-4 relative pl-6">
      {/* Vertical line for the timeline */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-primary/30 rounded-full"></div>

      {dailyPlan.map((item, index) => (
        <div key={index} className="relative flex items-start">
          {/* Dot on the timeline */}
          <div className="absolute left-0 top-1.5 transform -translate-x-[calc(50%-1px)] w-3 h-3 bg-primary rounded-full border-2 border-card z-10"></div>
          
          <div className={cn("ml-6 p-3 rounded-lg shadow-sm w-full", innerGlassEffectClasses)}>
            <div className="flex items-center mb-1.5">
              <CalendarDays className="w-4 h-4 mr-2 text-primary" />
              <h4 className="text-sm font-semibold text-card-foreground">{item.day}</h4>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
              {item.activities}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
