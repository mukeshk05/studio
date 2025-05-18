
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2Icon, SparklesIcon, SendIcon, InfoIcon, ExternalLinkIcon, Wand2Icon } from 'lucide-react';
import { generateSmartBundles } from '@/ai/flows/smart-bundle-flow';
import type { SmartBundleInput, SmartBundleOutput } from '@/ai/types/smart-bundle-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';


type SmartBundleGeneratorProps = {
    onPlanTripFromBundle: (tripIdea: AITripPlannerInput) => void;
};


export function SmartBundleGenerator({ onPlanTripFromBundle }: SmartBundleGeneratorProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [availability, setAvailability] = useState('');
  const [interests, setInterests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartBundleOutput['suggestions'] | null>(null);

  const handleGenerateBundle = async () => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to generate smart bundles.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSuggestions(null);
    try {
      const input: SmartBundleInput = {
        userId: currentUser.uid,
        upcomingAvailability: availability || undefined,
        travelInterests: interests || undefined,
      };
      const result = await generateSmartBundles(input);
      setSuggestions(result.suggestions);
      if (!result.suggestions || result.suggestions.length === 0) {
        toast({ title: "No Suggestions", description: "Aura AI couldn't generate specific bundles at this time. Try broadening your inputs or describe your ideal trip in the 'Travel Interests' field." });
      }
    } catch (error) {
      console.error("Error generating smart bundles with Aura AI:", error);
      toast({ title: "Error Generating Bundles", description: "Aura AI could not generate bundles. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const glassCardClasses = "glass-card";

  return (
    <Card className={cn(glassCardClasses, "w-full border-primary/20")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <Wand2Icon className="w-6 h-6 mr-2 text-primary" />
          Aura AI: Predictive Trip Ideas
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tell Aura AI your travel dreams, or leave blank for inspiration! It fuses your travel persona, history, and current wishes to predict & suggest ideal trips.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="interests" className="text-card-foreground/90">What kind of trip are you dreaming of? (Your query for Aura AI)</Label>
          <Textarea
            id="interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g., 'Relaxing beach vacation in Southeast Asia for two weeks around December, focus on good food and light snorkeling. Budget $2500.' or 'Weekend hiking trip in the mountains next month.'"
            className="mt-1 bg-background/70 dark:bg-input border-border/70 focus:bg-input/90 min-h-[80px]"
          />
        </div>
        <div>
          <Label htmlFor="availability" className="text-card-foreground/90">Upcoming Availability (Optional)</Label>
          <Textarea
            id="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g., 'Long weekend next month', 'Free in July for 2 weeks', 'Flexible autumn dates'"
            className="mt-1 bg-background/70 dark:bg-input border-border/70 focus:bg-input/90"
          />
        </div>
        <Button onClick={handleGenerateBundle} disabled={isLoading || !currentUser} className="w-full shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Let Aura AI Suggest Ideas
        </Button>

        {isLoading && !suggestions && (
          <div className="text-center py-4 text-muted-foreground">
            <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p>Aura AI is fusing preferences and crafting ideas...</p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Your Aura AI Suggested Trip Ideas:</h3>
            {suggestions.map((suggestion, index) => (
              <Card key={index} className={cn(glassCardClasses, "border-accent/30 animate-fade-in-up")} style={{animationDelay: `${index * 100}ms`}}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-md text-accent flex items-center">
                     <SparklesIcon className="w-5 h-5 mr-2"/>
                    {suggestion.bundleName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground flex items-start">
                    <InfoIcon className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-primary" />
                    <span className="font-semibold mr-1 text-card-foreground/90">Aura's Reasoning:</span> {suggestion.reasoning}
                  </p>
                  <div className={cn(glassCardClasses, "p-3 rounded-md border-border/40 bg-card/30")}>
                    <p className="font-semibold text-card-foreground/90">Trip Idea:</p>
                    <p><span className="font-medium">Destination:</span> {suggestion.tripIdea.destination}</p>
                    <p><span className="font-medium">Dates:</span> {suggestion.tripIdea.travelDates}</p>
                    <p><span className="font-medium">Budget:</span> ${suggestion.tripIdea.budget.toLocaleString()}</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full glass-interactive border-primary/30 text-primary hover:bg-primary/20"
                    onClick={() => onPlanTripFromBundle(suggestion.tripIdea)}
                    >
                    <ExternalLinkIcon className="mr-2 h-4 w-4" />
                    Plan this Trip
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
         {suggestions && suggestions.length === 0 && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            <p>Aura AI couldn't generate specific trip ideas with the current information. Try providing more details about your ideal trip, or explore general planning!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

