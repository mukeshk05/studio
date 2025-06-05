
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Sparkles, CloudLightning, CalendarClock, MailWarning, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const glassCardClasses = "glass-card border-red-500/30 hover:border-red-400/50 transition-all";

export function ProactiveJourneySentinelCard() {
  const router = useRouter();

  const handleConceptualDemo = () => {
    // In a real implementation, this might trigger a simulation
    // For now, it could navigate to the planner with some pre-filled context
    // or open a dialog explaining a sample scenario.
    // Let's just redirect to the main planner page as a placeholder action.
    router.push('/planner'); 
  };

  return (
    <Card className={cn(glassCardClasses, "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <ShieldAlert className="w-6 h-6 mr-2 text-red-400" />
            Proactive Journey Sentinel AI
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground whitespace-nowrap" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Imagine Aura AI proactively monitoring your saved trips for disruptions (weather, events) and suggesting intelligent alternatives.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png" 
                alt="Conceptual AI monitoring travel plans and suggesting alternatives"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai travel alerts dynamic replanning"
            />
          </div>
          <p>
            This advanced AI feature (conceptual) would work in the background:
          </p>
          <ul className="list-none space-y-1.5 pl-2 text-xs text-muted-foreground">
            <li className="flex items-start">
              <CloudLightning className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-red-400" />
              Monitors weather forecasts for significant changes (e.g., hurricanes, heavy snow) affecting your destination and dates.
            </li>
            <li className="flex items-start">
              <CalendarClock className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-red-400" />
              Scans for newly announced major events (festivals, conferences, strikes) that could impact your trip's feasibility or enjoyment.
            </li>
            <li className="flex items-start">
              <Sparkles className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-red-400" />
              If a potential issue is detected, Aura AI would attempt to generate alternative itineraries or package suggestions.
            </li>
            <li className="flex items-start">
              <MailWarning className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-red-400" />
              You would receive an alert (email/push) with the detected issue and the AI's proactive suggestions.
            </li>
          </ul>
          <div className="text-center mt-4">
            <Button
              variant="outline"
              className="glass-interactive border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleConceptualDemo}
              disabled={false} // Enable for conceptual navigation
            >
              <Sparkles className="w-4 h-4 mr-2" /> See AI Planner (Conceptual Link)
            </Button>
          </div>
        </div>
      </CardContent>
       <CardFooter className="pt-3">
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          Automated background monitoring and server-side alerts are complex backend features. This demonstrates the concept.
        </p>
      </CardFooter>
    </Card>
  );
}
