
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ListPlus, Info, ExternalLink, ImageOff } from 'lucide-react';
import { getItineraryAssistance } from '@/ai/flows/itinerary-assistance-flow';
import type { ItineraryAssistanceInput, SuggestedAddition } from '@/ai/types/itinerary-assistance-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGetUserTravelPersona } from '@/lib/firestoreHooks';

function SuggestedAdditionCard({ suggestion }: { suggestion: SuggestedAddition }) {
  const hintWords = suggestion.name.toLowerCase().split(/[\s,]+/).slice(0, 2).join(" ");
  const aiHint = suggestion.imageUri?.startsWith('https://placehold.co') ? hintWords : undefined;
  
  return (
    <Card className={cn("glass-card overflow-hidden w-full border-accent/20 transform hover:scale-[1.02] transition-transform duration-200")}>
      {suggestion.imageUri && (
        <div className="relative aspect-video w-full group">
          <Image
            src={suggestion.imageUri}
            alt={`Image for ${suggestion.name}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={aiHint}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      {!suggestion.imageUri && (
        <div className="aspect-video w-full bg-muted/50 flex items-center justify-center">
            <ImageOff className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-accent" />
          {suggestion.name}
        </CardTitle>
        <Badge variant="outline" className="text-xs w-fit mt-1 capitalize bg-accent/10 text-accent border-accent/30">{suggestion.type.replace("_", " ")}</Badge>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1.5 pt-0 pb-2">
        <p>{suggestion.description}</p>
        <div className={cn("p-2 rounded-md border-border/40 bg-card/30 dark:bg-card/50 text-xs")}>
            <p className="font-medium text-primary/90 flex items-start"><Info className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0 text-primary"/>AI Reasoning:</p> 
            <p className="italic pl-5">{suggestion.relevanceReasoning}</p>
        </div>
        {suggestion.estimatedCost && (
          <p className="font-medium text-primary">Estimated Cost: ${suggestion.estimatedCost.toLocaleString()}</p>
        )}
      </CardContent>
      {suggestion.bookingLink && (
        <CardFooter className="pt-1 pb-3">
          <Button variant="link" size="sm" asChild className="text-xs p-0 h-auto text-accent hover:text-accent/80">
            <a href={suggestion.bookingLink} target="_blank" rel="noopener noreferrer">
              Learn More / Book <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}


export function AiItineraryAssistanceCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [assistanceData, setAssistanceData] = useState<SuggestedAddition[] | null>(null);
  const [assistanceSummary, setAssistanceSummary] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { data: userPersona } = useGetUserTravelPersona();

  // Sample data for demonstration
  const sampleTripInput: ItineraryAssistanceInput = {
    userId: currentUser?.uid,
    destination: "Paris, France",
    travelDates: "Next month for 5 days",
    budget: 2000,
    existingActivities: "Eiffel Tower, Louvre Museum. Interested in romantic dinners and local culture.",
    hotelStyle: "boutique",
  };

  const handleFetchAssistance = async () => {
    setIsLoading(true);
    setAssistanceData(null);
    setAssistanceSummary(null);

    let finalInput = {...sampleTripInput};
    if (currentUser?.uid) {
      finalInput.userId = currentUser.uid;
    }
    if (userPersona) {
      finalInput.userPersonaName = userPersona.name;
      finalInput.userPersonaDescription = userPersona.description;
    }
    
    try {
      const result = await getItineraryAssistance(finalInput);
      setAssistanceData(result.suggestedAdditions);
      setAssistanceSummary(result.assistanceSummary || null);
      if (!result.suggestedAdditions || result.suggestedAdditions.length === 0) {
        toast({
            title: "No Specific Suggestions",
            description: "AI couldn't find specific new ideas for this sample trip, but here's a general one!",
        });
      }
    } catch (error) {
      console.error("Error fetching itinerary assistance:", error);
      toast({
        title: "Error Fetching Assistance",
        description: "Could not get AI suggestions at this moment. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <Card className={cn("glass-card w-full border-sky-500/30", "animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <ListPlus className="w-6 h-6 mr-2 text-sky-400" />
          AI Itinerary Enhancer
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Get AI-powered suggestions to enrich your travel plans. Try it with a sample trip to Paris!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!assistanceData && !isLoading && (
          <p className="text-sm text-center text-muted-foreground py-4">
            Click the button below to see how AI can enhance a sample trip to Paris with personalized activity, dining, or experience suggestions.
          </p>
        )}

        {isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-sky-400" />
            <p>Aura AI is finding enriching experiences...</p>
          </div>
        )}

        {assistanceData && !isLoading && (
          <div className="space-y-4">
            {assistanceSummary && (
                 <div className={cn("p-3 rounded-md text-sm italic", "bg-primary/10 text-primary border border-primary/20 flex items-start gap-2")}>
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <span><strong>Aura's Tip:</strong> {assistanceSummary}</span>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assistanceData.map((suggestion, index) => (
                <SuggestedAdditionCard key={index} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Button
          onClick={handleFetchAssistance}
          disabled={isLoading}
          size="lg"
          className={cn(prominentButtonClasses)}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {assistanceData ? "Refresh Sample Suggestions" : "Get Sample Assistance"}
        </Button>
         <p className="text-xs text-muted-foreground text-center">
            (Full integration with your saved trips coming soon!)
          </p>
      </CardFooter>
    </Card>
  );
}
