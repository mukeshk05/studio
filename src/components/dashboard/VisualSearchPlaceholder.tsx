
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScanSearchIcon, CameraIcon, GitCompareArrowsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function VisualSearchPlaceholder() {
  return (
    <Card className={cn("glass-card border-indigo-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <ScanSearchIcon className="w-6 h-6 mr-2 text-indigo-400" />
            AI Visual Search & Comparison
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Find similar options by image, or compare items with AI-driven insights.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI visual search and comparison interface for travel"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="visual search interface travel"
            />
          </div>
          <p>
            Imagine uploading a photo of a hotel or scenic spot to find similar destinations or accommodations. Or, select multiple flights/hotels and let AI provide a detailed feature-by-feature comparison to help you choose. You could even upload a flight screenshot to see if BudgetRoam can find a better deal!
          </p>
          <div className="flex items-center justify-center py-2 gap-3">
            <CameraIcon className="w-7 h-7 text-indigo-400/50 animate-pulse" />
            <GitCompareArrowsIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Making travel decisions easier with visual and comparative AI.
          </p>
        </div>
      </CardContent>
