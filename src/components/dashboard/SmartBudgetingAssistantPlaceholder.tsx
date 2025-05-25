
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PiggyBank, Sparkles, Replace, Info, CheckCircle, XCircle, Hotel, Plane, FerrisWheel } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // Keep for consistency, though not used for dynamic images here
import { Separator } from '@/components/ui/separator';

const glassCardClasses = "glass-card border-green-500/30 hover:border-green-400/50 transition-all";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

interface MockTripItem {
  id: string;
  type: 'Hotel' | 'Flight' | 'Activity';
  name: string;
  currentCost: number;
  details: string;
  icon: React.ReactNode;
}

interface MockAISuggestion {
  alternativeName: string;
  alternativeCost: number;
  savings: number;
  alternativeDetails: string;
  reasoning: string;
}

const mockTripItem: MockTripItem = {
  id: 'hotel1',
  type: 'Hotel',
  name: "Luxury Downtown Hotel",
  currentCost: 900,
  details: "3 nights, King Suite, City View",
  icon: <Hotel className="w-5 h-5 mr-2 text-primary" />
};

const mockAISuggestion: MockAISuggestion = {
  alternativeName: "Chic Boutique Hotel",
  alternativeCost: 720,
  savings: 180,
  alternativeDetails: "3 nights, Queen Room, 10min walk from center, great reviews",
  reasoning: "Similar guest rating, slightly further from absolute center but offers significant savings without compromising much on quality or experience."
};

export function SmartBudgetingAssistantPlaceholder() {
  return (
    <Card className={cn(glassCardClasses, "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <PiggyBank className="w-6 h-6 mr-2 text-green-400" />
            AI Smart Budgeting Assistant
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Future Vision: Aura AI analyzes your trip plan, identifies savings opportunities, and suggests budget-friendly alternatives without compromising your core travel preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-4">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface showing budget analysis and saving suggestions"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai budget travel forecast savings"
                priority
            />
          </div>

          <div className={cn("p-3 rounded-md", innerGlassEffectClasses)}>
            <h4 className="text-sm font-semibold text-card-foreground mb-1.5 flex items-center">
              {mockTripItem.icon}
              Current Plan Item (Example):
            </h4>
            <p className="text-xs"><strong className="text-card-foreground/90">{mockTripItem.name}</strong></p>
            <p className="text-xs text-muted-foreground">{mockTripItem.details}</p>
            <p className="text-sm font-medium text-primary mt-1">Cost: ${mockTripItem.currentCost.toLocaleString()}</p>
          </div>

          <Separator className="my-3 bg-green-500/30" />

          <div className={cn("p-3 rounded-md", innerGlassEffectClasses, "border-green-500/40")}>
            <h4 className="text-sm font-semibold text-green-400 mb-1.5 flex items-center">
              <Sparkles className="w-4 h-4 mr-2" />
              Aura's Smart Suggestion:
            </h4>
            <p className="text-xs"><strong className="text-card-foreground/90">{mockAISuggestion.alternativeName}</strong></p>
            <p className="text-xs text-muted-foreground">{mockAISuggestion.alternativeDetails}</p>
            <p className="text-sm font-medium text-green-500 mt-1">New Cost: ${mockAISuggestion.alternativeCost.toLocaleString()} (Save ${mockAISuggestion.savings.toLocaleString()}!)</p>
            <p className="text-xs italic text-muted-foreground/80 mt-1.5">
              <Info className="w-3 h-3 inline mr-1" />
              Reasoning: {mockAISuggestion.reasoning}
            </p>
            <div className="flex gap-2 mt-3">
              <Button variant="default" size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white" disabled>
                <CheckCircle className="w-4 h-4 mr-1.5" /> Accept Suggestion
              </Button>
              <Button variant="outline" size="sm" className="flex-1 glass-interactive border-destructive/50 text-destructive hover:bg-destructive/10" disabled>
                <XCircle className="w-4 h-4 mr-1.5" /> Keep Original
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            This AI would connect to real-time pricing APIs and learn your preferences to suggest optimal swaps (e.g., different hotel, flight time, activity vendor) that maintain your desired experience while saving money.
          </p>
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          This is a conceptual demonstration. Live price APIs and budget re-balancing are future features.
        </p>
      </CardFooter>
    </Card>
  );
}
