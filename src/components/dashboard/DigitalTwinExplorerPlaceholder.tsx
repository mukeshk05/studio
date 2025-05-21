
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrainCircuit, Clock, Layers, MapIcon, Users, Sun, CurlyBraces, Info, Lightbulb, ImageOff, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const glassCardClasses = "glass-card border-sky-500/30 hover:border-sky-400/50 transition-all";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

interface LandmarkData {
  name: string;
  imageSrc: string;
  dataAiHint: string;
  simulatedData: {
    crowdLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
    ambiance: string;
    bestTimeToVisit: string;
    notes?: string;
  };
}

const predefinedLandmarks: Record<string, LandmarkData> = {
  eiffel: {
    name: "Eiffel Tower, Paris",
    imageSrc: "https://placehold.co/600x400.png",
    dataAiHint: "eiffel tower paris",
    simulatedData: {
      crowdLevel: "High",
      ambiance: "Iconic, bustling with tourists, romantic city views.",
      bestTimeToVisit: "Early morning (8-10 AM) or late evening (after 9 PM) for potentially shorter queues and different light.",
      notes: "Book tickets online in advance to save time. Security can be tight."
    }
  },
  colosseum: {
    name: "Colosseum, Rome",
    imageSrc: "https://placehold.co/600x400.png",
    dataAiHint: "colosseum rome",
    simulatedData: {
      crowdLevel: "Very High",
      ambiance: "Historically awe-inspiring, surrounded by ancient ruins, can feel very crowded.",
      bestTimeToVisit: "Early morning as soon as it opens, or late afternoon. Consider a guided tour for context.",
      notes: "Wear comfortable shoes. Beware of pickpockets in crowded areas."
    }
  },
  timesSquare: {
    name: "Times Square, NYC",
    imageSrc: "https://placehold.co/600x400.png",
    dataAiHint: "times square new york",
    simulatedData: {
      crowdLevel: "Very High",
      ambiance: "Extremely vibrant, bright lights, constant motion, sensory overload.",
      bestTimeToVisit: "Evening for the full light show experience. Daytime is less intense but still busy.",
      notes: "It's a major tourist hub, always crowded. Great for people-watching."
    }
  },
  fuji: {
    name: "Mount Fuji, Japan",
    imageSrc: "https://placehold.co/600x400.png",
    dataAiHint: "mount fuji japan",
    simulatedData: {
      crowdLevel: "Moderate", // Varies by season/trail
      ambiance: "Majestic, serene from afar. Climbing season (July-Sept) can be crowded on popular trails.",
      bestTimeToVisit: "Clear mornings for best views. Climbing season is specific (July-September).",
      notes: "Check weather carefully. Altitude sickness can be a concern if climbing."
    }
  }
};


export function DigitalTwinExplorerPlaceholder() {
  const [selectedLandmarkKey, setSelectedLandmarkKey] = useState<string>("");
  const [currentLandmark, setCurrentLandmark] = useState<LandmarkData | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For simulated loading

  useEffect(() => {
    if (selectedLandmarkKey && predefinedLandmarks[selectedLandmarkKey]) {
      setIsLoading(true);
      // Simulate data fetching for the digital twin
      setTimeout(() => {
        setCurrentLandmark(predefinedLandmarks[selectedLandmarkKey]);
        setIsLoading(false);
      }, 700);
    } else {
      setCurrentLandmark(null);
    }
  }, [selectedLandmarkKey]);

  return (
    <Card className={cn(glassCardClasses, "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <Layers className="w-6 h-6 text-sky-400" />
              <CurlyBraces className="w-3.5 h-3.5 text-sky-600 absolute -bottom-1 -right-1 opacity-80" />
            </span>
            Predictive 'Digital Twin' Explorer
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Virtually "walk through" and experience destinations. AI simulates crowds, ambiance, and more. Select a landmark below to see a conceptual demo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select onValueChange={setSelectedLandmarkKey} value={selectedLandmarkKey}>
            <SelectTrigger className="w-full bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50">
              <SelectValue placeholder="Select a landmark to explore conceptually..." />
            </SelectTrigger>
            <SelectContent className="glass-pane border-border/50">
              {Object.entries(predefinedLandmarks).map(([key, landmark]) => (
                <SelectItem key={key} value={key}>{landmark.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              < LoaderCircle className="w-10 h-10 animate-spin mx-auto mb-3 text-sky-400" />
              <p>Loading conceptual Digital Twin data...</p>
            </div>
          )}

          {!isLoading && currentLandmark && (
            <div className={cn("mt-4 p-4 rounded-lg animate-fade-in", innerGlassEffectClasses)}>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">{currentLandmark.name} - Simulated Insights</h3>
              <div className="relative aspect-video w-full rounded-md overflow-hidden mb-4 border border-border/30 group shadow-lg">
                <Image
                    src={currentLandmark.imageSrc}
                    alt={`Image of ${currentLandmark.name}`}
                    fill
                    className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                    data-ai-hint={currentLandmark.dataAiHint}
                    sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <Users className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-sky-400" />
                  <div>
                    <span className="font-medium text-card-foreground/90">Simulated Crowd Level: </span>
                    <span className="text-muted-foreground">{currentLandmark.simulatedData.crowdLevel}</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <Sun className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-sky-400" />
                  <div>
                    <span className="font-medium text-card-foreground/90">Predicted Ambiance: </span>
                    <span className="text-muted-foreground">{currentLandmark.simulatedData.ambiance}</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-sky-400" />
                  <div>
                    <span className="font-medium text-card-foreground/90">Best Time to Visit (Conceptual): </span>
                    <span className="text-muted-foreground">{currentLandmark.simulatedData.bestTimeToVisit}</span>
                  </div>
                </div>
                {currentLandmark.simulatedData.notes && (
                  <div className="flex items-start">
                    <Lightbulb className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-yellow-400" />
                    <div>
                      <span className="font-medium text-card-foreground/90">Aura's Tip: </span>
                      <span className="text-muted-foreground">{currentLandmark.simulatedData.notes}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
           {!isLoading && !currentLandmark && selectedLandmarkKey && (
            <div className="text-center py-6 text-muted-foreground">
                <ImageOff className="w-10 h-10 mx-auto mb-2 opacity-50"/>
                <p>Could not load data for the selected landmark.</p>
            </div>
           )}
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          This is a conceptual demonstration. All "Digital Twin" data is simulated for illustrative purposes.
        </p>
      </CardFooter>
    </Card>
  );
}
