
"use client";

import React, { useState } from "react";
import { AdventureQuizForm } from "@/components/quiz/AdventureQuizForm";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, ExternalLink, Info, Route, CalendarDays, DollarSignIcon, MessageCircle } from "lucide-react";
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

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

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
          try {
            await saveUserTravelPersona.mutateAsync({
              name: primaryPersona.name,
              description: primaryPersona.description,
            });
            toast({
              title: "Travel Persona Updated!",
              description: `Your Travel DNA is now '${primaryPersona.name}'. This will help personalize your future suggestions.`,
              variant: "default",
              duration: 6000,
            });
          } catch (personaSaveError) {
             console.error("Failed to save travel persona:", personaSaveError);
             toast({
                title: "Persona Save Failed",
                description: "Could not update your travel persona at this time.",
                variant: "destructive"
             });
          }
        }
      } else {
        toast({
          title: "No Specific Matches",
          description: "We couldn't find a perfect match this time. Feel free to adjust your answers or explore general planning options!",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error matching adventure:", error);
      toast({
        title: "Error Fetching Suggestions",
        description: "Could not get adventure suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSuggestedTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    // Dispatch event for planner page to listen if it's already mounted
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up">
      <Card className={cn("w-full max-w-2xl mx-auto", glassCardClasses)}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center">
            <Brain className="w-8 h-8 mr-3 text-primary" />
            Discover Your Travel Persona
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Answer a few questions, and our AI will suggest your perfect adventure style! This helps BudgetRoam personalize future suggestions for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!aiSuggestions && !isLoading && (
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
              <h2 className="text-2xl font-semibold text-center text-foreground mb-6 flex items-center justify-center">
                <Sparkles className="w-7 h-7 mr-2 text-accent" />
                Your Adventure Matches!
              </h2>
              {aiSuggestions.map((suggestion, index) => (
                <Card key={index} className={cn(glassCardClasses, "border-accent/30 animate-fade-in-up")} style={{animationDelay: `${index * 120}ms`}}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl text-accent flex items-center">
                       <Sparkles className="w-5 h-5 mr-2"/>
                      {suggestion.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-4">
                    <p className="text-muted-foreground leading-relaxed">{suggestion.description}</p>

                    <div className={cn("p-3 rounded-md text-xs", innerGlassEffectClasses, "border-primary/20")}>
                        <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><MessageCircle className="w-3.5 h-3.5 mr-1.5 text-primary"/>Why this fits you:</h4>
                        <p className="italic text-muted-foreground">{suggestion.matchReasoning}</p>
                    </div>

                    {suggestion.exampleDestinations && suggestion.exampleDestinations.length > 0 && (
                       <div>
                        <h4 className="text-xs font-semibold text-card-foreground mb-1.5">Example Destinations:</h4>
                        <div className="flex flex-wrap gap-2">
                            {suggestion.exampleDestinations.map(dest => (
                                <Badge key={dest} variant="secondary" className="bg-primary/10 text-primary border-primary/20">{dest}</Badge>
                            ))}
                        </div>
                       </div>
                    )}

                    {suggestion.suggestedTripIdea && (
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <h4 className="text-sm font-semibold text-card-foreground mb-2 flex items-center"><Route className="w-4 h-4 mr-2 text-accent"/>Ready-to-Plan Idea:</h4>
                         <div className={cn("p-3 rounded-md mb-3 text-xs space-y-1", innerGlassEffectClasses, "border-accent/20")}>
                            <p><strong className="text-accent/90">Destination:</strong> {suggestion.suggestedTripIdea.destination}</p>
                            <p><strong className="text-accent/90 flex items-center"><CalendarDays className="w-3 h-3 mr-1"/>Dates:</strong> {suggestion.suggestedTripIdea.travelDates}</p>
                            <p><strong className="text-accent/90 flex items-center"><DollarSignIcon className="w-3 h-3 mr-1"/>Budget:</strong> ${suggestion.suggestedTripIdea.budget.toLocaleString()}</p>
                         </div>
                        <Button
                            onClick={() => handlePlanSuggestedTrip(suggestion.suggestedTripIdea!)}
                            className={cn("w-full", prominentButtonClasses)}
                            size="lg"
                        >
                          <ExternalLink className="mr-2 h-5 w-5" />
                          Plan This Trip
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Separator className="my-8 bg-border/40" />
              <Button
                onClick={() => {
                    setAiSuggestions(null);
                    // Optionally, reset form state if AdventureQuizForm holds its own state
                }}
                variant="outline"
                size="lg"
                className={cn("w-full glass-interactive text-lg py-3", "hover:bg-accent/10 hover:border-accent/50 hover:text-accent-foreground")}
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
