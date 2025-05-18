
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2Icon, SparklesIcon, SendIcon, InfoIcon, ExternalLinkIcon } from 'lucide-react';
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
        toast({ title: "No Suggestions", description: "The AI couldn't generate specific bundles at this time. Try broadening your inputs." });
      }
    } catch (error) {
      console.error("Error generating smart bundles:", error);
      toast({ title: "Error Generating Bundles", description: "Could not generate bundles. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const glassCardClasses = "glass-card";

  return (
    <Card className={cn(glassCardClasses, "w-full border-primary/20")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <SparklesIcon className="w-6 h-6 mr-2 text-primary" />
          AI Smart Bundle Generator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Let AI suggest trip packages based on your history, availability, and interests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="availability" className="text-card-foreground/90">Upcoming Availability (Optional)</Label>
          <Textarea
            id="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g., 'Long weekend next month', 'Free in July for 2 weeks'"
            className="mt-1 bg-background/70 dark:bg-input border-border/70 focus:bg-input/90"
          />
        </div>
        <div>
          <Label htmlFor="interests" className="text-card-foreground/90">Travel Interests (Optional)</Label>
          <Textarea
            id="interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g., 'Historical sites and local cuisine', 'Hiking and nature photography'"
            className="mt-1 bg-background/70 dark:bg-input border-border/70 focus:bg-input/90"
          />
        </div>
        <Button onClick={handleGenerateBundle} disabled={isLoading || !currentUser} className="w-full shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Generate Smart Bundle
        </Button>

        {isLoading && !suggestions && (
          <div className="text-center py-4 text-muted-foreground">
            <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>AI is thinking up some amazing trips for you...</p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Your AI-Suggested Bundles:</h3>
            {suggestions.map((suggestion, index) => (
              <Card key={index} className={cn(glassCardClasses, "border-accent/30")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-md text-accent flex items-center">
                     <SparklesIcon className="w-5 h-5 mr-2"/>
                    {suggestion.bundleName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground flex items-start">
                    <InfoIcon className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-primary" />
                    <span className="font-semibold mr-1 text-card-foreground/90">Reasoning:</span> {suggestion.reasoning}
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
            <p>No specific bundles could be generated with the current information. Try providing more details or explore general planning!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
