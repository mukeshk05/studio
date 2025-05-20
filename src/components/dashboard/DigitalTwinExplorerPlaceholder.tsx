
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CubeIcon, BrainCircuitIcon, ClockIcon } from 'lucide-react'; // Added CubeIcon, BrainCircuitIcon, ClockIcon
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function DigitalTwinExplorerPlaceholder() {
  return (
    <Card className={cn("glass-card border-sky-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <CubeIcon className="w-6 h-6 text-sky-400" />
              <BrainCircuitIcon className="w-3.5 h-3.5 text-sky-600 absolute -top-1 -right-1 opacity-80" />
            </span>
            Predictive 'Digital Twin' Explorer
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Virtually 'feel' a place before you go! AI simulates crowds, queues, and ambiance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI Digital Twin of a city for travel planning"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai digital twin city simulation"
            />
          </div>
          <p>
            Before your trip, explore a dynamic, AI-generated "digital twin" of a city or specific attractions. This isn't just a 3D model; it simulates crowd flows, potential queue times, and ambiance at different times of the day. Predictions are based on historical data, upcoming local events, and even weather forecasts.
          </p>
          <div className="flex items-center justify-center py-2 gap-3">
            <ClockIcon className="w-7 h-7 text-sky-400/50 animate-pulse" />
            <CubeIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '2.8s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Experience predictive travel planning like never before.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

