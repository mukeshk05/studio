
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Compass, Lightbulb, Info, ImageOff } from 'lucide-react';
import { getSerendipitySuggestions } from '@/ai/flows/serendipity-engine-flow';
import type { SerendipityInput, SerendipitySuggestion, SerendipityOutput } from '@/ai/types/serendipity-engine-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

function SerendipitySuggestionCard({ suggestion }: { suggestion: SerendipitySuggestion }) {
    const imageHint = suggestion.imageUri?.startsWith('https://placehold.co') 
        ? (suggestion.visualPrompt || suggestion.name.toLowerCase().split(" ").slice(0,2).join(" "))
        : undefined;

    return (
        <Card className={cn(innerGlassEffectClasses, "overflow-hidden w-full transform hover:scale-[1.02] transition-transform duration-200 border-accent/20")}>
             {suggestion.imageUri ? (
                <div className="relative aspect-video w-full group">
                    <Image
                        src={suggestion.imageUri}
                        alt={`Visual for ${suggestion.name}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={imageHint}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </div>
            ) : (
                <div className="aspect-video w-full bg-muted/50 flex items-center justify-center">
                    <ImageOff className="w-12 h-12 text-muted-foreground" />
                </div>
            )}
            <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-accent" />
                    {suggestion.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5 pt-0 pb-2">
                <p>{suggestion.description}</p>
                <div className={cn("p-2 rounded-md border-border/40 bg-card/30 dark:bg-card/50 text-xs")}>
                    <p className="font-medium text-primary/90 flex items-start"><Info className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0 text-primary"/>AI Reasoning:</p> 
                    <p className="italic pl-5">{suggestion.reasoning}</p>
                </div>
            </CardContent>
        </Card>
    );
}


export function SerendipityEnginePlaceholder() {
  const [destination, setDestination] = useState('');
  const [moodOrInterest, setMoodOrInterest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SerendipitySuggestion[] | null>(null);
  const { toast } = useToast();

  const handleDiscoverSerendipity = async () => {
    if (!destination.trim()) {
      toast({ title: "Input Required", description: "Please enter your current location or destination.", variant: "destructive" });
      return;
    }
    if (!moodOrInterest.trim()) {
      toast({ title: "Input Required", description: "Please tell us your current mood or interest.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setSuggestions(null);
    try {
      const input: SerendipityInput = {
        destination,
        currentMoodOrInterest: moodOrInterest,
      };
      const result: SerendipityOutput = await getSerendipitySuggestions(input);
      setSuggestions(result.suggestions);
      if (!result.suggestions || result.suggestions.length === 0) {
         toast({
            title: "No Unique Finds Now",
            description: `Aura AI couldn't find any special serendipitous moments for "${destination}" with interest "${moodOrInterest}" right now. Try again later or adjust your query!`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error fetching serendipity suggestions:", error);
      toast({
        title: "AI Error",
        description: "Could not get serendipity suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <Card className={cn(glassCardClasses, "w-full border-accent/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <Compass className="w-6 h-6 mr-2 text-accent" />
          AI Serendipity Engine
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Discover spontaneous, hyper-local experiences tailored to your mood and location. (This is a live AI demo!)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="serendipity-destination" className="text-card-foreground/90">Your Location/Destination</Label>
            <Input
              id="serendipity-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Paris, France or Shibuya, Tokyo"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
          <div>
            <Label htmlFor="serendipity-mood" className="text-card-foreground/90">Current Mood / Interest</Label>
            <Input
              id="serendipity-mood"
              value={moodOrInterest}
              onChange={(e) => setMoodOrInterest(e.target.value)}
              placeholder="e.g., Adventurous, Unique street food, Live music"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
        </div>

        <Button
          onClick={handleDiscoverSerendipity}
          disabled={isLoading || !destination.trim() || !moodOrInterest.trim()}
          size="lg"
          className={cn(prominentButtonClasses)}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Discover Serendipity with AI
        </Button>

        {isLoading && !suggestions && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-accent" />
            <p>Aura is scanning for unique local moments...</p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && !isLoading && (
          <div className="mt-6 space-y-5">
            <Separator className="my-4 bg-accent/30" />
            <h3 className="text-lg font-semibold text-card-foreground flex items-center">
               <Lightbulb className="w-5 h-5 mr-2 text-primary" /> AI's Serendipitous Finds:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((suggestion, index) => (
                <SerendipitySuggestionCard key={index} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
         {suggestions && suggestions.length === 0 && !isLoading && (
          <div className="text-center py-4 text-muted-foreground">
            <p>Aura AI couldn't find any special serendipitous moments with the current inputs. Try being more general or specific!</p>
          </div>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
            <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            This feature uses live AI calls to generate creative, plausible suggestions. Actual event availability is conceptual for this demo.
          </p>
       </CardFooter>
    </Card>
  );
}
