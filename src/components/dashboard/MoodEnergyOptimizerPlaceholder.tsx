
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SlidersHorizontalIcon, ZapIcon, MoonIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function MoodEnergyOptimizerPlaceholder() {
  return (
    <Card className={cn("glass-card border-green-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <SlidersHorizontalIcon className="w-6 h-6 mr-2 text-green-400" />
            Mood & Energy Optimizer
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          "I want a calm day" — AI reshuffles your plan considering mood, energy, sleep & activity history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual UI for mood and energy based travel planning"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="travel wellness planning slider"
            />
          </div>
          <p>
            Imagine adjusting your day's intensity with a slider, and Aura AI intelligently reshuffles your schedule (e.g., suggesting rest before a walk, then an activity). It would consider your desired mood, past activities, and one day, even integrate with wearables for dynamic wellness planning.
          </p>
          <div className="flex items-center justify-center py-2 gap-2">
            <ZapIcon className="w-8 h-8 text-green-400/50 animate-pulse" />
            <MoonIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Your itinerary, perfectly tuned to you.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
