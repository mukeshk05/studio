
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CameraIcon, SparklesIcon, EyeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AiArPreviewPlaceholder() {
  return (
    <Card className={cn("glass-card border-pink-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <CameraIcon className="w-6 h-6 text-pink-400" />
              <SparklesIcon className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1" />
            </span>
            AI + AR Live Preview
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          "Show me what this place looks like — now!" Real-time AR previews with AI-powered mood & activity tags.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI and AR enabled live destination preview interface"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="augmented reality travel hotspot live"
            />
          </div>
          <p>
            Imagine a real-time Augmented Reality preview of your destination's hotspots! See what it looks like "right now," with AI-powered mood tags like "Currently Bustling," "Romantic Evening Atmosphere," or "Optimal Photo Conditions: 6:35 PM," all informed by live camera analysis and crowd-sourced image feedback.
          </p>
          <div className="flex items-center justify-center py-2 gap-2">
            <EyeIcon className="w-8 h-8 text-pink-400/50 animate-pulse" />
            <CameraIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Step into your destination before you even leave home.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
