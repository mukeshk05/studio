
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2Icon, SparklesIcon, SlidersHorizontalIcon, InfoIcon, ZapIcon, ImageOffIcon, ActivityIcon, BrainIcon, MoonIcon, CoffeeIcon, SunIcon } from 'lucide-react';
import { optimizeDayPlanByMood } from '@/ai/flows/mood-energy-optimizer-flow';
import type { MoodEnergyOptimizerInput, MoodEnergyOptimizerOutput, SuggestedAdjustment } from '@/ai/types/mood-energy-optimizer-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGetUserTravelPersona } from '@/lib/firestoreHooks';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

const sampleDayPlan = "Morning: Visit the bustling Grand Bazaar (2-3 hours, high energy for crowds & bargaining).\nAfternoon: Guided tour of Topkapi Palace and Harem (3 hours, medium energy, lots of walking).\nEvening: Whirling Dervishes show followed by a traditional Turkish dinner in Sultanahmet (3-4 hours, low to medium energy).";

function AdjustmentDetailCard({ adjustment }: { adjustment: SuggestedAdjustment }) {
  const imageHint = adjustment.visualPrompt || adjustment.suggestionDetails.toLowerCase().split(" ").slice(0,2).join(" ");
  return (
    <Card className={cn(innerGlassEffectClasses, "overflow-hidden w-full transform hover:scale-[1.01] transition-transform duration-200 border-accent/20")}>
      {adjustment.imageUri && (
        <div className="relative aspect-video w-full group">
          <Image
            src={adjustment.imageUri}
            alt={`Visual for ${adjustment.suggestionDetails.substring(0,30)}...`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={imageHint}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      {!adjustment.imageUri && (
        <div className="aspect-video w-full bg-muted/50 flex items-center justify-center">
            <ImageOffIcon className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm font-semibold text-card-foreground flex items-center">
          <SparklesIcon className="w-4 h-4 mr-2 text-accent" />
          {adjustment.adjustmentType}
        </CardTitle>
        <Badge variant="outline" className="text-xs w-fit mt-1 capitalize bg-accent/10 text-accent border-accent/30">{adjustment.energyImpact}</Badge>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1.5 pt-0 pb-2">
        {adjustment.originalActivityContext && <p className="italic text-xs"><strong className="text-card-foreground/80">Context:</strong> Relates to "{adjustment.originalActivityContext.substring(0,50)}..."</p>}
        <p><strong className="text-card-foreground/90">Suggestion:</strong> {adjustment.suggestionDetails}</p>
        <p><strong className="text-card-foreground/90">Reasoning:</strong> {adjustment.reasoning}</p>
      </CardContent>
    </Card>
  );
}

export function MoodEnergyOptimizerCard() {
  const [currentDayPlan, setCurrentDayPlan] = useState(sampleDayPlan);
  const [desiredEnergy, setDesiredEnergy] = useState<"low" | "medium" | "high">("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<MoodEnergyOptimizerOutput | null>(null);
  
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { data: userPersona } = useGetUserTravelPersona();

  const handleOptimizeDay = async () => {
    if (!currentDayPlan.trim() || currentDayPlan.trim().length < 20) {
      toast({ title: "Input Required", description: "Please describe the day's plan (at least 20 characters).", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setOptimizationResult(null);
    try {
      const input: MoodEnergyOptimizerInput = {
        currentDayPlanDescription: currentDayPlan,
        desiredEnergyLevel: desiredEnergy,
        userPersonaName: userPersona?.name,
        userPersonaDescription: userPersona?.description,
      };
      const result = await optimizeDayPlanByMood(input);
      setOptimizationResult(result);
      if (!result || !result.suggestedAdjustments || result.suggestedAdjustments.length === 0) {
         toast({
            title: "No Specific Optimizations",
            description: `Aura couldn't find specific optimizations for this plan and energy level. Consider general relaxation or exploration based on your preference.`,
         });
      }
    } catch (error) {
      console.error("Error optimizing day plan by mood:", error);
      toast({ title: "AI Error", description: "Could not get optimization suggestions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(glassCardClasses, "w-full border-green-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <SlidersHorizontalIcon className="w-6 h-6 mr-2 text-green-400" />
          AI Mood & Energy Optimizer
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Adjust a day's intensity. Aura AI will suggest plan modifications based on your desired energy level and travel persona. (Demo with a sample Istanbul day)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="currentDayPlan" className="text-sm font-medium text-card-foreground/90">Current Day's Plan (Sample)</Label>
          <Textarea
            id="currentDayPlan"
            value={currentDayPlan}
            onChange={(e) => setCurrentDayPlan(e.target.value)}
            placeholder="Describe the day's activities..."
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[100px]"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-card-foreground/90">Desired Energy Level / Mood for the Day</Label>
          <RadioGroup
            value={desiredEnergy}
            onValueChange={(value: "low" | "medium" | "high") => setDesiredEnergy(value)}
            className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {[
              { value: "low", label: "Relaxing / Low Energy", icon: <MoonIcon className="w-4 h-4 mr-2 text-blue-400" /> },
              { value: "medium", label: "Balanced / Medium Energy", icon: <CoffeeIcon className="w-4 h-4 mr-2 text-orange-400" /> },
              { value: "high", label: "Action-Packed / High Energy", icon: <SunIcon className="w-4 h-4 mr-2 text-red-400" /> },
            ].map(opt => (
              <Label
                key={opt.value}
                htmlFor={`energy-${opt.value}`}
                className={cn(
                  "flex items-center space-x-2 p-3 rounded-md border transition-colors cursor-pointer",
                  innerGlassEffectClasses,
                  desiredEnergy === opt.value ? "border-primary ring-2 ring-primary bg-primary/10" : "border-border/50 hover:border-primary/40"
                )}
              >
                <RadioGroupItem value={opt.value} id={`energy-${opt.value}`} className="border-primary text-primary focus:ring-primary" />
                {opt.icon}
                <span className="text-xs font-medium text-card-foreground/90">{opt.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <Button
          onClick={handleOptimizeDay}
          disabled={isLoading || !currentDayPlan.trim()}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <BrainIcon />}
          Optimize My Day with AI
        </Button>

        {isLoading && !optimizationResult && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-green-400" />
            <p>Aura AI is tuning your day for the perfect vibe...</p>
          </div>
        )}

        {optimizationResult && !isLoading && (
          <div className="mt-6 space-y-5">
            <Separator className="my-4 bg-green-500/30" />
            <div className={cn("p-3 rounded-md text-sm italic", innerGlassEffectClasses, "border-primary/20 bg-primary/5")}>
                <InfoIcon className="w-4 h-4 mr-1.5 text-primary float-left mt-0.5" />
                <strong className="text-primary/90">Aura's Optimization Summary:</strong> {optimizationResult.optimizationSummary}
            </div>
            
            <div>
              <h3 className="text-md font-semibold text-card-foreground mb-3">Suggested Adjustments:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {optimizationResult.suggestedAdjustments.map((adjustment, index) => (
                  <AdjustmentDetailCard key={index} adjustment={adjustment} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <p className="text-xs text-muted-foreground text-center w-full">
          This feature simulates AI-driven itinerary adjustments. Full dynamic rescheduling of saved trips is a future concept.
        </p>
      </CardFooter>
    </Card>
  );
}
