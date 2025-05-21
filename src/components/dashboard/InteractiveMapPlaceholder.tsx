
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2Icon, SparklesIcon, MapPinnedIcon, LayersIcon, LightbulbIcon, InfoIcon } from 'lucide-react';
import { generateSmartMapConcept } from '@/ai/flows/smart-map-concept-flow';
import type { SmartMapConceptInput, SmartMapConceptOutput } from '@/ai/types/smart-map-concept-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function InteractiveMapPlaceholder() {
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapConcept, setMapConcept] = useState<SmartMapConceptOutput | null>(null);
  const { toast } = useToast();

  const handleGenerateConcept = async () => {
    if (!destination.trim()) {
      toast({ title: "Input Required", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setMapConcept(null);
    try {
      // For demo, using a generic persona. In a real app, this could come from user profile.
      const input: SmartMapConceptInput = {
        destination,
        userPersonaDescription: "A curious explorer interested in unique local experiences and cultural insights.",
      };
      const result = await generateSmartMapConcept(input);
      setMapConcept(result);
    } catch (error) {
      console.error("Error generating smart map concept:", error);
      toast({
        title: "AI Error",
        description: "Could not generate smart map concept. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const imageHint = mapConcept?.imagePrompt || (destination ? `map ${destination.substring(0,10)} concept` : "interactive map concept");


  return (
    <Card className={cn(glassCardClasses, "w-full border-purple-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <LayersIcon className="w-6 h-6 mr-2 text-purple-400" />
          AI Interactive Smart Map Concept
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          (Future Vision Demo) Enter a destination and let AI describe a conceptual, personalized smart map for it!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="map-destination" className="text-card-foreground/90">Destination</Label>
          <Input
            id="map-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g., Rome, Italy or Tokyo, Japan"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
          />
        </div>

        <Button
          onClick={handleGenerateConcept}
          disabled={isLoading || !destination.trim()}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Generate Smart Map Concept
        </Button>

        {isLoading && !mapConcept && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-400" />
            <p>Aura is envisioning your smart map...</p>
          </div>
        )}

        {mapConcept && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg text-accent flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                AI Smart Map Concept for {destination}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3 text-sm">
              <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg bg-muted/30">
                <Image
                    src={`https://placehold.co/600x400.png?text=${encodeURIComponent(mapConcept.imagePrompt || "Smart Map")}`}
                    alt={`Conceptual smart map for ${destination}`}
                    fill
                    className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                    data-ai-hint={imageHint}
                    sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><LightbulbIcon className="w-4 h-4 mr-1.5 text-primary" />Map Vision:</h4>
                <p className="text-muted-foreground pl-6">{mapConcept.mapConceptDescription}</p>
              </div>
              
              <Separator className="bg-border/40" />

              {mapConcept.suggestedLayers && mapConcept.suggestedLayers.length > 0 && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><LayersIcon className="w-4 h-4 mr-1.5 text-primary" />Suggested Personalized Layers:</h4>
                  <div className="flex flex-wrap gap-1.5 pl-6">
                    {mapConcept.suggestedLayers.map((layer, idx) => <Badge key={`layer-${idx}`} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{layer}</Badge>)}
                  </div>
                </div>
              )}

              {mapConcept.examplePois && mapConcept.examplePois.length > 0 && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><MapPinnedIcon className="w-4 h-4 mr-1.5 text-primary" />Example Unique POIs to Highlight:</h4>
                  <ul className="list-none space-y-1 pl-6">
                    {mapConcept.examplePois.map((poi, idx) => <li key={`poi-${idx}`} className="text-xs text-muted-foreground before:content-['\272A'] before:mr-2 before:text-accent">{poi}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
            <InfoIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            This is a conceptual demonstration using AI to generate ideas. Actual map interface is a future vision.
          </p>
       </CardFooter>
    </Card>
  );
}
