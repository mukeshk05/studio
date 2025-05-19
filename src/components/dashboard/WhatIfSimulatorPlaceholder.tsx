
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitCompareArrowsIcon, ReplaceIcon, RouteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function WhatIfSimulatorPlaceholder() {
  return (
    <Card className={cn("glass-card border-orange-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <GitCompareArrowsIcon className="w-6 h-6 mr-2 text-orange-400" />
            AI 'What If' Travel Simulator
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Explore alternative travel scenarios with AI-powered comparisons. "What if I went to Vietnam instead of Bali?"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI travel scenario comparison interface"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai travel comparison"
            />
          </div>
          <p>
            Curious about alternatives? AI could simulate and compare costs, weather, visa needs, activities, and the overall 'vibe' for different scenarios. Imagine easily exporting an entire alternative trip plan with just one click!
          </p>
          <div className="flex items-center justify-center py-2 gap-2">
            <RouteIcon className="w-8 h-8 text-orange-400/50 animate-pulse" />
            <ReplaceIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Get data-driven insights to make the best travel choices.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
