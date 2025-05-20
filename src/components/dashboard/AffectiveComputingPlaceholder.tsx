"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeartPulseIcon, UsersIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AffectiveComputingPlaceholder() {
  return (
    <Card className={cn("glass-card border-rose-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <HeartPulseIcon className="w-6 h-6 mr-2 text-rose-400" />
            Affective Group Vibe Optimizer
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          AI that (with consent) helps enhance group travel enjoyment and cohesion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface for group mood optimization"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai group mood travel"
            />
          </div>
          <p>
            Imagine AI, with full consent, subtly sensing the group's vibe via check-ins or future wearable integrations. If energy seems low or stressed, it might proactively suggest a universally appealing break, a fun shared snack, or a calming activity tailored to your group's combined personas.
          </p>
          <div className="flex items-center justify-center py-2 gap-3">
            <UsersIcon className="w-7 h-7 text-rose-400/50 animate-pulse" />
            <SparklesIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Enhancing shared experiences through intelligent, empathetic suggestions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}