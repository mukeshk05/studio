
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuitIcon, ClockIcon, CubeIcon, LayersIcon, MapIcon, UsersIcon, SunIcon } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function DigitalTwinExplorerPlaceholder() {
  return (
    <Card className={cn("glass-card border-sky-500/30 hover:border-sky-400/50 transition-all", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <LayersIcon className="w-6 h-6 text-sky-400" />
              <CubeIcon className="w-3.5 h-3.5 text-sky-600 absolute -bottom-1 -right-1 opacity-80" />
            </span>
            Predictive 'Digital Twin' Explorer
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground whitespace-nowrap" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Virtually "walk through" and experience destinations before you go! AI simulates crowds, queues, ambiance, and more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI Digital Twin interface of a bustling city square for travel planning"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai digital twin city simulation travel"
            />
          </div>
          <p>
            Imagine stepping into a dynamic, AI-generated "digital twin" of your chosen city or even specific attractions. This isn't just a static 3D model; Aura AI would simulate:
          </p>
          <ul className="list-none space-y-1.5 pl-2 text-xs text-muted-foreground">
            <li className="flex items-start"><UsersIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-sky-400" /> Realistic crowd flows at different times of day.</li>
            <li className="flex items-start"><ClockIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-sky-400" /> Potential queue lengths for popular spots.</li>
            <li className="flex items-start"><SunIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-sky-400" /> The general ambiance and 'vibe' based on time, weather, and local events.</li>
            <li className="flex items-start"><MapIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-sky-400" /> How long it might take to get from one point to another considering typical conditions.</li>
          </ul>
          <p className="mt-2">
            These simulations would be powered by analyzing historical data, current event schedules, and even weather forecasts, allowing you to make much more informed decisions and truly get a "feel" for a place before your trip.
          </p>
          <div className="flex items-center justify-center py-2 gap-3 mt-3">
            <CubeIcon className="w-7 h-7 text-sky-400/50 animate-pulse" />
            <BrainCircuitIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Experience predictive travel planning like never before – see it, feel it, then book it.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

