
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheckIcon, CalendarDaysIcon, SparklesIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AiCalendarSyncPlaceholder() {
  return (
    <Card className={cn("glass-card border-cyan-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <CalendarCheckIcon className="w-6 h-6 mr-2 text-cyan-400" />
            AI Calendar SyncUp
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          "When am I free for a getaway?" — AI finds open slots and suggests trips.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI calendar sync for travel planning interface"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai calendar travel planning"
            />
          </div>
          <p>
            Imagine BudgetRoam AI seamlessly syncing with your calendar, identifying your free long weekends or vacation slots, and proactively suggesting personalized trip ideas that fit perfectly into your schedule. Effortless planning, tailored to your true availability!
          </p>
          <div className="flex items-center justify-center py-2 gap-2">
            <CalendarDaysIcon className="w-8 h-8 text-cyan-400/50 animate-pulse" />
            <SparklesIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Unlock smarter scheduling for your adventures.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
