
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheck, CalendarDays, Sparkles, Plane, Loader2, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // Kept for consistency, though not used dynamically here
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useRouter } from 'next/navigation';

// Renaming component to AiCalendarSyncCard
// No longer a placeholder, but an interactive simulation

const glassCardClasses = "glass-card border-cyan-500/30 hover:border-cyan-400/50 transition-all";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

interface MockCalendarEvent {
  title: string;
  start: Date;
  end: Date;
}

interface FreeSlot {
  start: Date;
  end: Date;
  durationDays: number;
}

interface SimulatedTripSuggestion extends AITripPlannerInput {
  id: string;
  suggestionTitle: string;
  reasoning?: string;
}

// Sample mock calendar data - in a real app, this would come from a calendar API
const mockEvents: MockCalendarEvent[] = [
  { title: "Team Meeting", start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000) }, // In 2 days
  { title: "Project Deadline", start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000) }, // In 5 days
  { title: "Dentist Appointment", start: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000) }, // In 10 days
  // Add a longer gap for a potential longer trip
  { title: "Work Conference", start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), end: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000) }, // In 1 month, 3 days long
];

// Simple function to find free slots (very basic simulation)
const findSimulatedFreeSlots = (events: MockCalendarEvent[], lookaheadDays: number = 60): FreeSlot[] => {
  const slots: FreeSlot[] = [];
  const now = new Date();
  let currentSearchStart = new Date(now);
  currentSearchStart.setDate(now.getDate() + 1); // Start looking from tomorrow

  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    if (event.start > currentSearchStart) {
      const diffTime = Math.abs(event.start.getTime() - currentSearchStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 2) { // Minimum 2-day slot
        slots.push({ start: new Date(currentSearchStart), end: new Date(event.start.setDate(event.start.getDate() -1)), durationDays: diffDays });
      }
    }
    if (event.end > currentSearchStart) {
      currentSearchStart = new Date(event.end);
      currentSearchStart.setDate(currentSearchStart.getDate() + 1); // Move to day after event ends
    }
    if (slots.length >= 2) break; // Limit to 2 found slots for demo
  }
  
  // Check for a slot at the end of the lookahead period
  const endOfLookahead = new Date(now);
  endOfLookahead.setDate(now.getDate() + lookaheadDays);
  if (currentSearchStart < endOfLookahead) {
    const diffTime = Math.abs(endOfLookahead.getTime() - currentSearchStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays >= 2 && slots.length < 2) {
       slots.push({ start: new Date(currentSearchStart), end: new Date(endOfLookahead), durationDays: diffDays });
     }
  }

  return slots.slice(0,2); // Return max 2 slots
};

const generateMockTripSuggestions = (slot: FreeSlot): SimulatedTripSuggestion[] => {
  const suggestions: SimulatedTripSuggestion[] = [];
  const formatDate = (date: Date) => `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
  const travelDates = `${formatDate(slot.start)} - ${formatDate(slot.end)}, ${slot.durationDays} days`;

  if (slot.durationDays <= 3) { // Weekend / Short trip
    suggestions.push({
      id: `weekend-${slot.start.getTime()}`,
      suggestionTitle: "Quick City Escape",
      destination: "Nearby City (e.g., San Francisco, CA or Asheville, NC)",
      travelDates: travelDates,
      budget: Math.floor(Math.random() * 300) + 500, // $500 - $800
      reasoning: `Aura AI noticed you have a ${slot.durationDays}-day gap. Perfect for a refreshing city break! This suggestion aligns with a general explorer persona.`,
    });
  } else if (slot.durationDays <= 7) { // ~Week long
    suggestions.push({
      id: `week-${slot.start.getTime()}`,
      suggestionTitle: "Relaxing Beach Getaway",
      destination: "Coastal Town (e.g., Miami, FL or San Diego, CA)",
      travelDates: travelDates,
      budget: Math.floor(Math.random() * 500) + 1000, // $1000 - $1500
      reasoning: `This ${slot.durationDays}-day slot is ideal for a beach escape. Aura AI suggests this for travelers who enjoy sun and relaxation.`,
    });
  } else { // Longer trip
     suggestions.push({
      id: `long-${slot.start.getTime()}`,
      suggestionTitle: "National Park Adventure",
      destination: "Explore a National Park (e.g., Yellowstone or Zion)",
      travelDates: travelDates,
      budget: Math.floor(Math.random() * 800) + 1500, // $1500 - $2300
      reasoning: `With ${slot.durationDays} days free, Aura AI recommends an immersive nature trip. Great for outdoor enthusiasts!`,
    });
  }
  return suggestions;
};


export function AiCalendarSyncCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [tripSuggestions, setTripSuggestions] = useState<SimulatedTripSuggestion[]>([]);
  const router = useRouter();

  const handleAnalyzeCalendar = () => {
    setIsLoading(true);
    setFreeSlots([]);
    setTripSuggestions([]);

    setTimeout(() => { // Simulate API call and AI processing
      const slots = findSimulatedFreeSlots(mockEvents);
      setFreeSlots(slots);
      const suggestions = slots.flatMap(slot => generateMockTripSuggestions(slot));
      setTripSuggestions(suggestions.slice(0,2)); // Max 2 suggestions overall for demo
      setIsLoading(false);
    }, 1500);
  };

  const handlePlanTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };


  return (
    <Card className={cn(glassCardClasses, "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <CalendarCheck className="w-6 h-6 mr-2 text-cyan-400" />
            AI Calendar SyncUp
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          (Future Vision Demo) Aura AI could analyze your calendar for free slots and proactively suggest personalized trip ideas. Click below to see a simulation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI calendar sync for travel planning interface with suggested trip cards"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai calendar travel scheduling smart"
                priority
            />
          </div>
          
          <Button
            onClick={handleAnalyzeCalendar}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isLoading ? "AI Analyzing Schedule..." : "Find Trip Opportunities (Simulated)"}
          </Button>

          {isLoading && !freeSlots.length && (
            <div className="text-center py-6 text-muted-foreground">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-cyan-400" />
              <p>Aura is checking your (simulated) availability...</p>
            </div>
          )}

          {!isLoading && freeSlots.length === 0 && tripSuggestions.length === 0 && !isLoading && (
             <p className="text-sm text-muted-foreground text-center pt-2">Click the button above to simulate calendar analysis.</p>
          )}
          
          {tripSuggestions.length > 0 && !isLoading && (
            <div className="mt-6 space-y-5">
              <Separator className="my-4 bg-cyan-500/30" />
              <h3 className="text-md font-semibold text-card-foreground flex items-center">
                 <Sparkles className="w-5 h-5 mr-2 text-primary" /> Aura's Proactive Trip Ideas:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tripSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className={cn(innerGlassEffectClasses, "overflow-hidden transform hover:scale-[1.01] transition-transform duration-200")}>
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm font-semibold text-accent flex items-center">
                        <Plane className="w-4 h-4 mr-2" />
                        {suggestion.suggestionTitle}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs w-fit mt-1 border-cyan-500/50 text-cyan-400 bg-cyan-500/10">
                        For {suggestion.travelDates}
                      </Badge>
                    </CardHeader>
                    <CardContent className="text-xs space-y-1.5 text-muted-foreground">
                      <p><span className="font-medium text-card-foreground/90">Destination:</span> {suggestion.destination}</p>
                      <p><span className="font-medium text-card-foreground/90">Est. Budget:</span> ${suggestion.budget.toLocaleString()}</p>
                      {suggestion.reasoning && <p className="italic"><span className="font-medium text-card-foreground/90">Aura's Note:</span> {suggestion.reasoning}</p>}
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full glass-interactive text-primary hover:bg-primary/20 hover:text-primary-foreground"
                        onClick={() => handlePlanTrip(suggestion)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" /> Plan This Trip
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          This is a conceptual frontend simulation. Actual calendar integration and AI analysis would require backend services.
        </p>
      </CardFooter>
    </Card>
  );
}

// Ensure the component is exported with the new name if it's to be used directly
// If this file itself is renamed to AiCalendarSyncCard.tsx, then the default export is fine.
// Assuming the file name will be changed to AiCalendarSyncCard.tsx.
export default AiCalendarSyncCard;
