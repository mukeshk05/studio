
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCopyIcon, LayersIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function PostTripSynthesizerPlaceholder() {
  return (
    <Card className={cn("glass-card border-emerald-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <BookCopyIcon className="w-6 h-6 text-emerald-400" />
              <LayersIcon className="w-3.5 h-3.5 text-emerald-600 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            AI Post-Trip Synthesizer
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Transform your travel memories into shareable stories, highlight reels, or even expense summaries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface for post-trip memory synthesis"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai travel journal memories"
            />
          </div>
          <p>
            Imagine AI helping you synthesize your journey after you return. It could analyze your photos, check-ins, and notes to:
          </p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-2">
            <li>Generate a "Travelogue" or "Memory Snippet".</li>
            <li>Create a shareable highlight video concept.</li>
            <li>Categorize expenses from receipts (if integrated).</li>
            <li>Suggest "next time" improvements based on your feedback.</li>
          </ul>
          <div className="flex items-center justify-center py-2 gap-3">
            <SparklesIcon className="w-7 h-7 text-emerald-400/50 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Relive and share your adventures in new, meaningful ways.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
