
"use client";

import React, { useState } from "react";
import { AdventureQuizForm } from "@/components/quiz/AdventureQuizForm";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles, ExternalLink, Info, Route, CalendarDays, DollarSign, MessageCircle, Trash2, XIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { matchAdventure } from "@/ai/flows/adventure-matcher-flow";
import type { AdventureQuizInput, AdventureMatcherOutput, AdventureSuggestion } from "@/ai/types/adventure-matcher-types";
import type { AITripPlannerInput, QuizResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSaveUserTravelPersona, useAddQuizResult, useQuizHistory, useRemoveQuizResult } from "@/lib/firestoreHooks";
import { useAuth } from "@/contexts/AuthContext";
import { FlightProgressIndicator } from "@/components/ui/FlightProgressIndicator";
import { formatDistanceToNow } from 'date-fns';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

function QuizHistoryCard({ result, onDelete, onView }: { result: QuizResult; onDelete: (id: string) => void; onView: () => void; }) {
  const mainSuggestion = result.suggestions.suggestions[0];
  return (
     <Card 
      className={cn(glassCardClasses, "border-border/30 w-full group transition-all hover:border-primary/40 cursor-pointer")}
      onClick={onView}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onView(); }}
      tabIndex={0}
      role="button"
    >
      <CardHeader className="pb-2 pt-3">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors">{mainSuggestion.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(result.createdAt?.toDate?.() || result.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10 z-10" onClick={(e) => { e.stopPropagation(); onDelete(result.id); }}>
                <Trash2 className="w-4 h-4"/>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1 pb-3">
        <p className="font-medium text-card-foreground/90">Your Answers:</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <p><strong className="capitalize">{result.answers.pace}:</strong> Pace</p>
            <p><strong className="capitalize">{result.answers.environment}:</strong> Environment</p>
            <p><strong className="capitalize">{result.answers.style}:</strong> Style</p>
            <p><strong className="capitalize">{result.answers.company}:</strong> Company</p>
            <p className="col-span-2"><strong className="capitalize">{result.answers.interest.replace(/-/g, ' ')}:</strong> Interest</p>
        </div>
        <p className="text-xs text-right text-primary/70 italic pt-2">Click to view full AI results</p>
      </CardContent>
    </Card>
  );
}

export default function AdventureQuizPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AdventureSuggestion[] | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const saveUserTravelPersona = useSaveUserTravelPersona();

  const addQuizResultMutation = useAddQuizResult();
  const { data: quizHistory, isLoading: isLoadingHistory } = useQuizHistory();
  const removeQuizResultMutation = useRemoveQuizResult();

  const handleSubmitQuiz = async (answers: AdventureQuizInput) => {
    if (!currentUser) {
        toast({title: "Please Log In", description: "You need to be logged in to save your quiz results.", variant: "destructive"});
        return;
    }
    setIsLoading(true);
    setAiSuggestions(null);
    try {
      const result: AdventureMatcherOutput = await matchAdventure(answers);
      if (result.suggestions && result.suggestions.length > 0) {
        setAiSuggestions(result.suggestions);

        // Save persona to profile
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
           toast({ title: "Persona Save Failed", description: "Could not update your travel persona at this time.", variant: "destructive" });
        }
        
        // Save quiz result to history
        await addQuizResultMutation.mutateAsync({
          answers,
          suggestions: result,
        });

      } else {
        toast({ title: "No Specific Matches", description: "We couldn't find a perfect match this time. Feel free to adjust your answers or explore general planning options!", variant: "default" });
        setAiSuggestions([]); 
      }
    } catch (error) {
      console.error("Error matching adventure:", error);
      toast({ title: "Error Fetching Suggestions", description: "Could not get adventure suggestions. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSuggestedTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await removeQuizResultMutation.mutateAsync(itemToDelete, {
        onSuccess: () => {
          toast({ title: "Success", description: "Quiz result removed from your history." });
          setItemToDelete(null);
          setIsDeleteDialogOpen(false);
        },
        onError: (error) => {
          toast({ title: "Error", description: `Could not remove item: ${error.message}`, variant: "destructive" });
          setItemToDelete(null);
          setIsDeleteDialogOpen(false);
        }
      });
    }
  };

  const handleViewHistory = (result: QuizResult) => {
    setAiSuggestions(result.suggestions.suggestions);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


  return (
    <>
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
            <AdventureQuizForm onSubmit={handleSubmitQuiz} isSubmitting={isLoading || authLoading || addQuizResultMutation.isPending} />
          )}

          {isLoading && (
            <FlightProgressIndicator 
              message="Our AI is discovering your travel style... This might take a moment." 
              className="py-10"
            />
          )}

          {aiSuggestions && !isLoading && (
            <div className="space-y-6 mt-8">
              <h2 className="text-2xl font-semibold text-center text-foreground mb-6 flex items-center justify-center">
                <Sparkles className="w-7 h-7 mr-2 text-accent" />
                {aiSuggestions.length > 0 ? "Your Adventure Matches!" : "No Specific Matches Found"}
              </h2>
              {aiSuggestions.length === 0 && (
                 <p className="text-center text-muted-foreground">We couldn't pinpoint an exact match this time. Try adjusting your answers or explore general planning options!</p>
              )}
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
                            <p><strong className="text-accent/90 flex items-center"><DollarSign className="w-3 h-3 mr-1"/>Budget:</strong> ${suggestion.suggestedTripIdea.budget.toLocaleString()}</p>
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

      {/* Quiz History Section */}
       <div className="w-full max-w-2xl mx-auto mt-12">
            <Separator className="my-8 bg-border/40" />
            <h2 className="text-2xl font-semibold text-center text-foreground mb-6">Quiz History</h2>
            {authLoading || isLoadingHistory ? (
                <div className="text-center text-muted-foreground py-4"><Loader2 className="animate-spin inline-block mr-2" />Loading your history...</div>
            ) : !currentUser ? (
                <p className="text-center text-muted-foreground">Log in to see your quiz history.</p>
            ) : quizHistory && quizHistory.length > 0 ? (
                <div className="space-y-4">
                    {quizHistory.map(result => (
                       <QuizHistoryCard 
                          key={result.id} 
                          result={result} 
                          onDelete={handleDeleteClick} 
                          onView={() => handleViewHistory(result)}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground">No quiz history yet. Take the quiz to discover your travel style!</p>
            )}
       </div>
    </div>
    
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent className={cn(glassCardClasses)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this quiz result from your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete} 
            disabled={removeQuizResultMutation.isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {removeQuizResultMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
