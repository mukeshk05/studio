
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SparklesIcon, CompassIcon, LocateFixedIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SerendipityEnginePlaceholder() {
  return (
    <Card className={cn("glass-card border-accent/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <SparklesIcon className="w-6 h-6 mr-2 text-accent" />
            Serendipity Engine
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Coming Soon!)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Discover spontaneous, hyper-local experiences in real-time!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <p>
            Imagine Aura AI proactively finding unique events, hidden gems, and fleeting local moments unfolding near you, all perfectly matched to your Travel DNA and current mood.
          </p>
          <div className="flex items-center justify-center py-4">
            <CompassIcon className="w-16 h-16 text-accent/40 animate-pulse" />
            <LocateFixedIcon className="w-12 h-12 text-primary/30 absolute animate-ping" style={{ animationDuration: '2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Get ready for spontaneous adventures and authentic discoveries beyond the guidebook.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
