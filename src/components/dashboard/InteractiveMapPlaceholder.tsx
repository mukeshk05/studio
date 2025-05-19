
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPinnedIcon, LayersIcon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function InteractiveMapPlaceholder() {
  return (
    <Card className={cn("glass-card border-purple-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <LayersIcon className="w-6 h-6 mr-2 text-purple-400" />
            Interactive Smart Map
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Visually explore and plan with AI-curated, filterable map layers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual interactive travel map interface"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="interactive travel map ui"
            />
          </div>
          <p>
            Imagine exploring destinations on an intelligent map that clusters attractions, restaurants, and experiences based on your Travel DNA. Filter by your interests, discover hidden gems visually, and directly add them to your itinerary.
          </p>
          <div className="flex items-center justify-center py-2 gap-2">
            <MapPinnedIcon className="w-8 h-8 text-purple-400/50 animate-pulse" />
            <SearchIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            A map-based trip builder with AI-curated pins is part of our future vision!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
