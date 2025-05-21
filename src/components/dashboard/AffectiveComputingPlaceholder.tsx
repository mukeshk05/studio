
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeartPulseIcon, UsersIcon, SparklesIcon, SmileIcon, MessageSquareHeartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AffectiveComputingPlaceholder() {
  return (
    <Card className={cn("glass-card border-rose-500/30 hover:border-rose-400/50 transition-all", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <HeartPulseIcon className="w-6 h-6 text-rose-400" />
              <SmileIcon className="w-3.5 h-3.5 text-rose-600 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            Affective Group Vibe Optimizer
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground whitespace-nowrap" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Imagine AI (with full consent) subtly sensing your group's collective mood and energy levels to enhance travel enjoyment and cohesion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface showing group mood and suggesting activities"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai group mood travel positive"
            />
          </div>
          <p>
            This futuristic feature envisions AI analyzing anonymized, aggregated group inputs (like simple mood check-ins, or in the distant future, consensual wearable data). If it senses dipping energy, rising stress, or diverging interests, Aura AI could proactively suggest:
          </p>
          <ul className="list-none space-y-1 pl-2 text-xs text-muted-foreground">
            <li className="flex items-start"><SparklesIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-rose-400" /> A universally appealing break (e.g., "Time for a scenic coffee stop?").</li>
            <li className="flex items-start"><MessageSquareHeartIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-rose-400" /> A light-hearted shared activity or game suitable for the location.</li>
            <li className="flex items-start"><UsersIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-rose-400" /> Optional, smaller group activities if diverse preferences emerge, then reconvening.</li>
          </ul>
          <p className="mt-2">
             The goal is to foster better group dynamics and ensure everyone enjoys the journey through intelligent, empathetic, and timely suggestions tailored to the group's combined travel personas.
          </p>
          <div className="flex items-center justify-center py-2 gap-3 mt-3">
            <UsersIcon className="w-7 h-7 text-rose-400/50 animate-pulse" />
            <HeartPulseIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Enhancing shared experiences by understanding and adapting to the group's collective emotional state.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
