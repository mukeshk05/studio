
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LanguagesIcon, MicIcon, Volume2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function HyperLocalLanguageCoachPlaceholder() {
  return (
    <Card className={cn("glass-card border-lime-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <LanguagesIcon className="w-6 h-6 mr-2 text-lime-400" />
            AI Hyper-Local Language Coach
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          "Speak like a local, not just a tourist." Understand dialects, slang, and cultural nuances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI language and dialect coaching interface"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai language learning app"
            />
          </div>
          <p>
            Go far beyond basic phrasebooks. This AI helps you understand and practice local dialects, slang, idioms, and even common conversational fillers for very specific regions. Get real-time pronunciation feedback and cultural context for phrases, helping you engage more authentically.
          </p>
          <div className="flex items-center justify-center py-2 gap-3">
            <MicIcon className="w-7 h-7 text-lime-400/50 animate-pulse" />
            <Volume2Icon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '2.8s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Unlock deeper connections through authentic communication.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
