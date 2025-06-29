

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Replace, Wand2, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

const glassCardClasses = "glass-card border-indigo-500/30 hover:border-indigo-400/50 transition-all";

export function WhatIfPlanChangeCard() {

  const prominentButtonClasses = "w-full sm:w-auto text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <Card className={cn(glassCardClasses, "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <Replace className="w-6 h-6 mr-2 text-indigo-400" />
            “What If I Change Plans?” Simulator
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          (Conceptual Demo) Explore how your trip might look if you alter destinations, duration, or activities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface showing itinerary modification options"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai itinerary modification what if"
            />
          </div>
          <p>
            Ever wondered, "What if I went to <span className="font-semibold text-primary">Thailand for 10 days</span> instead of Bali for 7, keeping a similar budget?" Or, "What if I skipped the museums in Paris and focused only on food tours and local markets?"
          </p>
          <p>
            Aura AI can help you visualize these changes by generating a completely new set of itineraries based on your modified preferences.
          </p>
          <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
            <h4 className="font-semibold text-primary mb-1.5 text-sm">How to Simulate a Plan Change:</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
              <li>Go to the <strong className="text-card-foreground">AI Trip Planner</strong> page.</li>
              <li>Click <strong className="text-card-foreground">"Compose Detailed Trip Request"</strong>.</li>
              <li>In the form, enter your <strong className="text-card-foreground">new, modified preferences</strong> for destination, dates, budget, etc.</li>
              <li>You can add a note in the "Desired Mood/Vibe" or "Specific Concerns" fields, like: <br /><em>"Original plan: 7 days Paris, $2000. Now: 5 days Paris, 3 days Amsterdam, same budget. Focus: Art & History."</em></li>
              <li>Let Aura AI generate fresh itineraries based on your "what if" scenario!</li>
            </ol>
          </div>
          <div className="text-center mt-4">
            <Button asChild size="lg" className={cn(prominentButtonClasses, "text-base py-2.5")}>
              <Link href="/planner">
                <Wand2 className="w-5 h-5 mr-2" />
                Go to AI Trip Planner
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
       <CardFooter className="pt-3">
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          This guides you to use the main planner. Direct 'edit and re-plan' of saved trips is a future concept.
        </p>
      </CardFooter>
    </Card>
  );
}
