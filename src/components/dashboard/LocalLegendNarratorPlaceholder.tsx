"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpenTextIcon, MapPinIcon, Volume2Icon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function LocalLegendNarratorPlaceholder() {
  return (
    <Card className={cn("glass-card border-yellow-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <BookOpenTextIcon className="w-6 h-6 text-yellow-400" />
              <MapPinIcon className="w-3.5 h-3.5 text-yellow-600 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            AI Local Legend & Folklore Narrator
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          AI-driven storytelling bringing hidden cultural heritage to life as you explore.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI storytelling app interface for travel"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai storytelling travel folklore"
            />
          </div>
          <p>
            Imagine exploring, and as you approach a landmark or scan it with your phone, an AI narrator shares obscure local legends, folklore, historical anecdotes, or even "ghost stories" tied to your precise location. Narration could adapt to time of day or weather for enhanced atmosphere.
          </p>
          <div className="flex items-center justify-center py-2 gap-3">
            <Volume2Icon className="w-7 h-7 text-yellow-400/50 animate-pulse" />
            <SparklesIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Unlock the unseen stories of every place you visit.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}