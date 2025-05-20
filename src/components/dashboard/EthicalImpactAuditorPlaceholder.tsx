"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheckIcon, LeafIcon, CheckCircleIcon, ScaleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function EthicalImpactAuditorPlaceholder() {
  return (
    <Card className={cn("glass-card border-green-600/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <ShieldCheckIcon className="w-6 h-6 text-green-500" />
              <LeafIcon className="w-3.5 h-3.5 text-green-700 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            AI Ethical & Sustainable Impact Auditor
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Go beyond simple eco-labels for truly responsible travel choices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface for ethical and sustainable travel audit"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ethical sustainable travel audit"
            />
          </div>
          <p>
            Imagine AI analyzing your full itinerary for deep ethical and sustainable impact – considering fair wages, animal welfare, over-tourism, plastic use, and genuine community support. Crucially, it would suggest specific, vetted, comparable alternatives for components with lower scores.
          </p>
          <div className="flex items-center justify-center py-2 gap-3">
            <ScaleIcon className="w-7 h-7 text-green-500/50 animate-pulse" />
            <CheckCircleIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Making informed, impactful, and responsible travel decisions, easier.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}