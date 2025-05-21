
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2Icon, SparklesIcon, AccessibilityIcon, InfoIcon, AlertTriangleIcon, SearchCheckIcon, ImageOffIcon, CheckCircleIcon, XCircleIcon, AlertCircleIcon } from 'lucide-react';
import { getPersonalizedAccessibilityScout } from '@/ai/flows/personalized-accessibility-scout-flow';
import type { PersonalizedAccessibilityScoutInput, PersonalizedAccessibilityScoutOutput } from '@/ai/types/personalized-accessibility-scout-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function PersonalizedAccessibilityScoutCard() {
  const [destination, setDestination] = useState('');
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scoutResult, setScoutResult] = useState<PersonalizedAccessibilityScoutOutput | null>(null);
  const { toast } = useToast();

  const handleScoutAccessibility = async () => {
    if (!destination.trim()) {
      toast({ title: "Input Required", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    if (!accessibilityNeeds.trim() || accessibilityNeeds.trim().length < 10) {
      toast({ title: "Input Required", description: "Please describe your accessibility needs in at least 10 characters.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setScoutResult(null);
    try {
      const input: PersonalizedAccessibilityScoutInput = {
        destination,
        accessibilityNeeds,
      };
      const result = await getPersonalizedAccessibilityScout(input);
      setScoutResult(result);
      if (!result || !result.overallAssessment) {
         toast({
            title: "No Specific Assessment",
            description: `Aura couldn't generate a detailed accessibility assessment for "${destination}" with the provided needs. Please try again or broaden your query.`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error fetching accessibility scout report:", error);
      toast({
        title: "AI Error",
        description: "Could not fetch accessibility information at this moment. Please try again.",
        variant: "destructive",
      });
      setScoutResult({
        overallAssessment: "Failed to retrieve accessibility assessment due to an error.",
        disclaimer: `This AI-generated information is for preliminary guidance only and not a substitute for thorough personal research and consultation with official accessibility resources for ${destination}. Verify all details with providers and local authorities before traveling.`,
        imagePrompt: `accessible travel error ${destination.substring(0,10)}`,
        imageUri: `https://placehold.co/600x400.png?text=Error+Fetching+Report`,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const imageHint = scoutResult?.imagePrompt || `accessible travel ${destination.substring(0,10)}`;

  return (
    <Card className={cn(glassCardClasses, "w-full border-blue-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <AccessibilityIcon className="w-6 h-6 mr-2 text-blue-400" />
          AI Personalized Accessibility Scout
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Get AI-powered insights on how a destination might cater to specific accessibility needs. This is a starting point for your research.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="scout-destination" className="text-card-foreground/90">Destination *</Label>
            <Input
              id="scout-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Rome, Italy or Grand Canyon National Park"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
          <div>
            <Label htmlFor="scout-needs" className="text-card-foreground/90">Describe Your Accessibility Needs *</Label>
            <Textarea
              id="scout-needs"
              value={accessibilityNeeds}
              onChange={(e) => setAccessibilityNeeds(e.target.value)}
              placeholder="E.g., 'Wheelchair user, require step-free hotel room & routes. Need info on accessible transport. Sensitive to loud noises, prefer quiet dining. Gluten-free food options are essential.'"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[100px]"
            />
          </div>
        </div>

        <Button
          onClick={handleScoutAccessibility}
          disabled={isLoading || !destination.trim() || accessibilityNeeds.trim().length < 10}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SearchCheckIcon />}
          Scout Accessibility with AI
        </Button>

        {isLoading && !scoutResult && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-400" />
            <p>Aura is researching accessibility insights for {destination}...</p>
          </div>
        )}

        {scoutResult && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg text-accent flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                Accessibility Scout Report for {destination}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {scoutResult.imageUri && (
                 <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
                    <Image
                        src={scoutResult.imageUri}
                        alt={`Visual for accessibility at ${destination}`}
                        fill
                        className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={imageHint}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                 </div>
              )}
              {!scoutResult.imageUri && (
                <div className="aspect-video w-full bg-muted/50 flex items-center justify-center rounded-md mb-3 border border-border/30">
                    <ImageOffIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              <div>
                <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><InfoIcon className="w-4 h-4 mr-1.5 text-primary" />Overall Assessment:</h4>
                <p className="text-sm text-muted-foreground pl-6">{scoutResult.overallAssessment}</p>
              </div>
              
              <Separator className="bg-border/40" />

              {scoutResult.positiveAspects && scoutResult.positiveAspects.length > 0 && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1.5 text-green-500" />Potential Positives:</h4>
                  <ul className="list-none space-y-1 pl-6">
                    {scoutResult.positiveAspects.map((item, idx) => <li key={`pos-${idx}`} className="text-sm text-muted-foreground before:content-['\2713'] before:mr-2 before:text-green-500">{item}</li>)}
                  </ul>
                </div>
              )}

              {scoutResult.potentialChallenges && scoutResult.potentialChallenges.length > 0 && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><XCircleIcon className="w-4 h-4 mr-1.5 text-red-500" />Potential Challenges:</h4>
                  <ul className="list-none space-y-1 pl-6">
                    {scoutResult.potentialChallenges.map((item, idx) => <li key={`chal-${idx}`} className="text-sm text-muted-foreground before:content-['\2717'] before:mr-2 before:text-red-500">{item}</li>)}
                  </ul>
                </div>
              )}

              {scoutResult.specificSuggestions && scoutResult.specificSuggestions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><SparklesIcon className="w-4 h-4 mr-1.5 text-accent" />Specific Suggestions & Next Steps:</h4>
                  <ul className="list-none space-y-1 pl-6">
                    {scoutResult.specificSuggestions.map((item, idx) => <li key={`sug-${idx}`} className="text-sm text-muted-foreground before:content-['\2022'] before:mr-2 before:text-accent">{item}</li>)}
                  </ul>
                </div>
              )}
              
              <Separator className="bg-border/40 my-3" />
              
              <div className={cn("p-3 rounded-md text-xs", "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-start gap-2")}>
                <AlertTriangleIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                <p><strong>Important Disclaimer:</strong> {scoutResult.disclaimer}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full">
            This tool provides AI-simulated accessibility insights. Always verify with official sources.
          </p>
       </CardFooter>
    </Card>
  );
}
