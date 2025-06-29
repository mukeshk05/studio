
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Info, ExternalLink, Wand2, Plane, Hotel as HotelIcon, AlertTriangle, DollarSign, Save } from 'lucide-react'; 
import { generateSmartBundles } from '@/app/actions'; 
import type { SmartBundleInput, SmartBundleOutput, BundleSuggestion } from '@/ai/types/smart-bundle-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AITripPlannerInput, FlightOption, HotelOption } from '@/ai/types/trip-planner-types';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { FlightProgressIndicator } from '../ui/FlightProgressIndicator';
import { useAddSavedIdea, useSavedIdeas } from '@/lib/firestoreHooks';


type SmartBundleGeneratorProps = {
    onPlanTripFromBundle: (tripIdea: AITripPlannerInput) => void;
};

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";
const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";
const prominentButtonClassesSm = "text-sm py-2 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-2 focus-visible:ring-primary/30 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


function RealDataSnippet({ flight, hotel }: { flight?: FlightOption; hotel?: HotelOption }) {
    if (!flight && !hotel) return null;
    return (
        <div className={cn("p-2 mt-2 text-xs border rounded-md", innerGlassEffectClasses)}>
            {flight && (
                <div className="mb-1.5">
                    <p className="font-medium text-card-foreground/90 flex items-center"><Plane className="w-3.5 h-3.5 mr-1.5 text-primary" /> Flight Example:</p>
                    <p className="pl-5 text-muted-foreground">{flight.name} - ~${flight.price.toLocaleString()}</p>
                     {flight.derived_stops_description && <p className="pl-5 text-muted-foreground text-[0.7rem]">({flight.derived_stops_description})</p>}
                </div>
            )}
            {hotel && (
                 <div className={flight ? "pt-1.5 border-t border-border/30" : ""}>
                    <p className="font-medium text-card-foreground/90 flex items-center"><HotelIcon className="w-3.5 h-3.5 mr-1.5 text-primary" /> Hotel Example:</p>
                    <p className="pl-5 text-muted-foreground">{hotel.name} - ~${hotel.price.toLocaleString()} (est. total)</p>
                    {hotel.rating && <p className="pl-5 text-muted-foreground text-[0.7rem]">Rating: {hotel.rating.toFixed(1)} ★</p>}
                </div>
            )}
        </div>
    );
}

function SuggestionCard({ suggestion, onPlanTripFromBundle }: { suggestion: BundleSuggestion, onPlanTripFromBundle: (tripIdea: AITripPlannerInput) => void }) {
  const addSavedIdeaMutation = useAddSavedIdea();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { data: savedIdeas } = useSavedIdeas();

  const isIdeaSaved = React.useMemo(() => {
    if (!savedIdeas) return false;
    return savedIdeas.some(saved => saved.bundle.bundleName === suggestion.bundleName && saved.bundle.tripIdea.destination === suggestion.tripIdea.destination);
  }, [savedIdeas, suggestion]);

  const handleSaveIdea = async () => {
    if (!currentUser) {
      toast({ title: "Login required", description: "Please log in to save AI-generated ideas.", variant: "destructive" });
      return;
    }
    await addSavedIdeaMutation.mutateAsync({ bundle: suggestion }, {
      onSuccess: () => {
        toast({ title: "Idea Saved!", description: `"${suggestion.bundleName}" has been saved.` });
      },
      onError: (error) => {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
      }
    });
  };

  return (
    <Card className={cn(glassCardClasses, "border-accent/30 animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-md text-accent flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          {suggestion.bundleName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p className="text-muted-foreground flex items-start">
          <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-primary" />
          <span className="font-semibold mr-1 text-card-foreground/90">Aura's Reasoning:</span> {suggestion.reasoning}
        </p>
        <div className={cn(innerGlassEffectClasses, "p-3 rounded-md border-border/40")}>
          <p className="font-semibold text-card-foreground/90 text-xs">Conceptual Trip Idea:</p>
          <p><span className="font-medium">Destination:</span> {suggestion.tripIdea.destination}</p>
          <p><span className="font-medium">Dates:</span> {suggestion.tripIdea.travelDates}</p>
          <p><span className="font-medium">AI Budget:</span> ${suggestion.tripIdea.budget.toLocaleString()}</p>
        </div>
        {(suggestion.realFlightExample || suggestion.realHotelExample) && (
          <RealDataSnippet flight={suggestion.realFlightExample} hotel={suggestion.realHotelExample} />
        )}
        {suggestion.estimatedRealPriceRange && (
          <p className="text-sm font-semibold text-primary mt-1.5 flex items-center">
            <DollarSign className="w-4 h-4 mr-1" /> Estimated Real Price: {suggestion.estimatedRealPriceRange}
          </p>
        )}
        {suggestion.priceFeasibilityNote && (
          <div className={cn("p-2 mt-2 text-xs italic rounded-md", 
            suggestion.priceFeasibilityNote.includes("Good news!") ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" :
            suggestion.priceFeasibilityNote.includes("closer to") ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
            "bg-muted/50 border-border/30"
          )}>
            <Info className="w-3.5 h-3.5 mr-1.5 float-left mt-0.5" />
            {suggestion.priceFeasibilityNote}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button
          variant={isIdeaSaved ? "secondary" : "default"}
          size="sm"
          className="w-full sm:flex-1 glass-interactive"
          disabled={isIdeaSaved || addSavedIdeaMutation.isPending || !currentUser}
          onClick={handleSaveIdea}
        >
          {addSavedIdeaMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
          {isIdeaSaved ? "Saved" : "Save Idea"}
        </Button>
        <Button
          className={cn("w-full sm:flex-1", prominentButtonClassesSm)}
          size="sm"
          onClick={() => onPlanTripFromBundle(suggestion.tripIdea)}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Plan this Trip
        </Button>
      </CardFooter>
    </Card>
  );
}


export function SmartBundleGenerator({ onPlanTripFromBundle }: SmartBundleGeneratorProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [availability, setAvailability] = useState('');
  const [interests, setInterests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BundleSuggestion[] | null>(null); 

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

  return (
    <Card className={cn(glassCardClasses, "w-full border-primary/20")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <Wand2 className="w-6 h-6 mr-2 text-primary" />
          Aura AI: Predictive Preference Fusion
        </CardTitle>
        <CardDescription className="text-muted-foreground">
        Describe your ideal trip, or leave the fields blank and let Aura AI suggest ideas based on your travel persona and past searches! It intelligently fuses these with real-time data checks to predict your perfect getaway.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="interests" className="text-card-foreground/90">What kind of trip are you dreaming of? (Your query for Aura AI)</Label>
          <Textarea
            id="interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="e.g., 'A 5-day trip to see cherry blossoms in Kyoto next April, budget $2000.' or 'Relaxing beach vacation in Southeast Asia, focus on good food and light snorkeling.'"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[80px]"
          />
        </div>
        <div>
          <Label htmlFor="availability" className="text-card-foreground/90">Upcoming Availability (Optional)</Label>
          <Textarea
            id="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g., 'Long weekend next month', 'Free in July for 2 weeks', 'Flexible autumn dates'"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
          />
        </div>
        <Button
          onClick={handleGenerateBundle}
          disabled={isLoading || !currentUser}
          size="lg"
          className={cn("w-full", prominentButtonClasses)}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Let Aura AI Suggest Ideas
        </Button>

        {isLoading && !suggestions && (
          <FlightProgressIndicator message="Aura AI is fusing preferences, checking real-time data, and crafting ideas..." className="py-4"/>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground">Your Aura AI Suggested Trip Ideas:</h3>
            {suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} onPlanTripFromBundle={onPlanTripFromBundle} />
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
