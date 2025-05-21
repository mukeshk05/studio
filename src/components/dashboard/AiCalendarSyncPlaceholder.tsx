
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheckIcon, CalendarDaysIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AiCalendarSyncPlaceholder() {
  return (
    <Card className={cn("glass-card border-cyan-500/30 hover:border-cyan-400/50 transition-all", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <CalendarCheckIcon className="w-6 h-6 mr-2 text-cyan-400" />
            AI Calendar SyncUp
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          "When am I free for a getaway?" — Imagine Aura AI finding open slots in your calendar and proactively suggesting personalized trip ideas that fit perfectly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI calendar sync for travel planning interface with suggested trip cards"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai calendar travel scheduling smart"
            />
          </div>
          <p>
            This future feature envisions BudgetRoam AI seamlessly integrating with your digital calendar. It would intelligently identify your free long weekends, vacation blocks, or even gaps between appointments, and then proactively suggest:
          </p>
          <ul className="list-none space-y-1 pl-2 text-xs text-muted-foreground">
            <li className="flex items-start">
              <SparklesIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-cyan-400" />
              Hyper-personalized trip ideas tailored to your Travel DNA and the duration of the free slot.
            </li>
            <li className="flex items-start">
              <CalendarDaysIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-cyan-400" />
              Options for quick weekend getaways or longer, more immersive journeys.
            </li>
             <li className="flex items-start">
              <SparklesIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-cyan-400" />
              Consideration for travel time, ensuring suggestions are practical for the available window.
            </li>
          </ul>
          <p className="mt-2">
             Effortless planning, smart scheduling, and more opportunities for adventure, all initiated by your AI travel companion!
          </p>
          <div className="flex items-center justify-center py-2 gap-2 mt-3">
            <CalendarDaysIcon className="w-8 h-8 text-cyan-400/50 animate-pulse" />
            <SparklesIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Unlock smarter scheduling for your adventures.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

