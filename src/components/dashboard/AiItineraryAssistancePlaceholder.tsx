
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListPlusIcon, BotIcon, RouteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AiItineraryAssistancePlaceholder() {
  return (
    <Card className={cn("glass-card border-sky-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <ListPlusIcon className="w-6 h-6 text-sky-400" />
              <BotIcon className="w-3.5 h-3.5 text-sky-600 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            AI Itinerary Assistance
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Once core bookings are made, AI helps fill in the gaps with compatible activities and dining.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface for itinerary building assistance"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai itinerary builder planning"
            />
          </div>
          <p>
            After you've booked your main flight and hotel, Aura AI can help you build out the rest of your personalized itinerary. Based on your Travel DNA, booked items, and destination, it can suggest:
          </p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-2">
            <li>Compatible activities and tours.</li>
            <li>Restaurant recommendations fitting your style and budget.</li>
            <li>Optimal routes between points of interest.</li>
            <li>Booking links for suggested additions.</li>
          </ul>
          <div className="flex items-center justify-center py-2 gap-3">
            <RouteIcon className="w-7 h-7 text-sky-400/50 animate-pulse" />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Effortlessly create a full, rich itinerary from your core plans.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
