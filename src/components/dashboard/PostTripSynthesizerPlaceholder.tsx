
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayersIcon, BookCopyIcon, SparklesIcon, RouteIcon, TrendingUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function PostTripSynthesizerPlaceholder() {
  return (
    <Card className={cn("glass-card border-emerald-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <LayersIcon className="w-6 h-6 text-emerald-400" />
              <SparklesIcon className="w-3.5 h-3.5 text-emerald-600 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            AI Post-Trip Synthesizer & Trajectory Mapper
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          AI analyzes rich post-trip feedback to refine your Travel DNA and map out future travel trajectories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface for post-trip analysis and future travel trajectory mapping"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai travel trajectory planning"
            />
          </div>
          <p>
            After your journey, share photos, journal entries, and detailed feedback. Our AI will analyze this rich data to deeply understand what resonated most (or least). It then:
          </p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-2">
            <li>Refines your "Travel DNA" with these new, nuanced insights.</li>
            <li>Uniquely maps out potential "future travel trajectories"—suggesting a series of experiences or destinations that logically build upon your most positive past travels or explore related, evolving interests.</li>
            <li>Example: <span className="italic">"You loved the architectural focus in Barcelona and the history in Rome; your next ideal trajectory might involve exploring ancient sites in Greece, followed by the art nouveau of Prague."</span></li>
          </ul>
          <div className="flex items-center justify-center py-2 gap-3">
            <TrendingUpIcon className="w-7 h-7 text-emerald-400/50 animate-pulse" />
            <RouteIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Transforming past experiences into a roadmap for future adventures.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
