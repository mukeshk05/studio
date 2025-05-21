
"use client";

import React, { useState } from "react";
import { AdventureQuizForm } from "@/components/quiz/AdventureQuizForm";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, ExternalLink, Info } from "lucide-react"; // Corrected
import { cn } from "@/lib/utils";
import { matchAdventure } from "@/ai/flows/adventure-matcher-flow";
import type { AdventureQuizInput, AdventureMatcherOutput, AdventureSuggestion } from "@/ai/types/adventure-matcher-types";
import type { AITripPlannerInput } from "@/ai/types/trip-planner-types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSaveUserTravelPersona } from "@/lib/firestoreHooks";
import { useAuth } from "@/contexts/AuthContext";

export default function AdventureQuizPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AdventureSuggestion[] | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();
  const saveUserTravelPersona = useSaveUserTravelPersona();

  const handleSubmitQuiz = async (answers: AdventureQuizInput) => {
    setIsLoading(true);
    setAiSuggestions(null);
    try {
      const result: AdventureMatcherOutput = await matchAdventure(answers);
      if (result.suggestions && result.suggestions.length > 0) {
        setAiSuggestions(result.suggestions);

        if (currentUser && result.suggestions[0]) {
          const primaryPersona = result.suggestions[0];
          await saveUserTravelPersona.mutateAsync({
            name: primaryPersona.name,
            description: primaryPersona.description,
          });
          toast({
            title: "Travel Persona Updated!",
            description: `Your Travel DNA is now '${primaryPersona.name}'.`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "No Specific Matches",
          description: "We couldn't find a perfect match this time, but explore general planning options!",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error matching adventure:", error);
      toast({
        title: "Error",
        description: "Could not get adventure suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSuggestedTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    const event = new CustomEvent('localStorageUpdated_tripBundleToPlan');
    window.dispatchEvent(event);
    router.push('/planner');
  };

  const glassCardClasses = "glass-card";

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up">
      <Card className={cn("w-full max-w-2xl mx-auto", glassCardClasses)}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center">
            <Brain className="w-8 h-8 mr-3 text-primary" />
            Discover Your Travel Persona
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Answer a few questions, and our AI will suggest your perfect adventure style! This helps us personalize future suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!aiSuggestions && (
            <AdventureQuizForm onSubmit={handleSubmitQuiz} isSubmitting={isLoading} />
          )}

          {isLoading && (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-lg">Our AI is discovering your travel style...</p>
              <p className="text-sm">This might take a moment.</p>
            </div>
          )}

          {aiSuggestions && !isLoading && (
            <div className="space-y-6 mt-8">
              <h2 className="text-2xl font-semibold text-center text-foreground mb-4 flex items-center justify-center">
                <Sparkles className="w-7 h-7 mr-2 text-accent" />
                Your Adventure Matches!
              </h2>
              {aiSuggestions.map((suggestion, index) => (
                <Card key={index} className={cn(glassCardClasses, "border-accent/30 animate-fade-in-up")} style={{animationDelay: `${index * 100}ms`}}>
                  <CardHeader>
                    <CardTitle className="text-xl text-accent flex items-center">
                       <Sparkles className="w-5 h-5 mr-2"/>
                      {suggestion.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                    <p className="text-muted-foreground">{suggestion.description}</p>

                    <div className={cn(glassCardClasses, "p-3 rounded-md border-border/40 bg-card/30 dark:bg-card/50")}>
                        <h4 className="font-semibold text-card-foreground mb-1">Why this fits you:</h4>
                        <p className="text-xs text-muted-foreground italic flex items-start">
                            <Info className="w-3 h-3 mr-1.5 mt-0.5 shrink-0 text-primary" />
                            {suggestion.matchReasoning}
                        </p>
                    </div>

                    {suggestion.exampleDestinations && suggestion.exampleDestinations.length > 0 && (
                       <div>
                        <h4 className="font-semibold text-card-foreground mb-1">Example Destinations:</h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestion.exampleDestinations.map(dest => (
                                <Badge key={dest} variant="secondary" className="bg-primary/10 text-primary border-primary/20">{dest}</Badge>
                            ))}
                        </div>
                       </div>
                    )}

                    {suggestion.suggestedTripIdea && (
                      <div className="mt-4 pt-3 border-t border-border/30">
                        <h4 className="font-semibold text-card-foreground mb-1.5">Ready-to-Plan Idea:</h4>
                         <div className={cn(glassCardClasses, "p-3 rounded-md border-primary/20 bg-primary/5 mb-3")}>
                            <p><span className="font-medium text-primary/90">Destination:</span> {suggestion.suggestedTripIdea.destination}</p>
                            <p><span className="font-medium text-primary/90">Dates:</span> {suggestion.suggestedTripIdea.travelDates}</p>
                            <p><span className="font-medium text-primary/90">Budget:</span> ${suggestion.suggestedTripIdea.budget.toLocaleString()}</p>
                         </div>
                        <Button
                            onClick={() => handlePlanSuggestedTrip(suggestion.suggestedTripIdea!)}
                            size="lg"
                            className="w-full text-lg py-3 glass-interactive"
                            variant="outline"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Plan This Trip
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Separator className="my-6" />
              <Button
                onClick={() => setAiSuggestions(null)}
                variant="outline"
                size="lg"
                className="w-full text-lg py-3 glass-interactive"
              >
                Take the Quiz Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
