
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2Icon, SparklesIcon, BookOpenTextIcon, MapPinIcon, LandmarkIcon, ImageOffIcon, InfoIcon } from 'lucide-react';
import { narrateLocalLegend } from '@/ai/flows/local-legend-narrator-flow';
import type { LocalLegendNarratorInput, LocalLegendNarratorOutput } from '@/ai/types/local-legend-narrator-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '../ui/scroll-area';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function LocalLegendNarratorCard() {
  const [destination, setDestination] = useState('');
  const [landmarkOrContext, setLandmarkOrContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [legendData, setLegendData] = useState<LocalLegendNarratorOutput | null>(null);
  const { toast } = useToast();

  const handleFetchLegend = async () => {
    if (!destination.trim()) {
      toast({ title: "Input Required", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setLegendData(null);
    try {
      const input: LocalLegendNarratorInput = {
        destination,
        landmarkOrContext: landmarkOrContext || undefined,
      };
      const result = await narrateLocalLegend(input);
      setLegendData(result);
      if (!result || !result.narrative) {
         toast({
            title: "No Story Found",
            description: `Aura couldn't find a specific legend for "${landmarkOrContext ? `${landmarkOrContext} in ` : ''}${destination}". Try a broader search or another place!`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error fetching local legend:", error);
      toast({
        title: "AI Error",
        description: "Could not fetch a local legend at this moment. Please try again.",
        variant: "destructive",
      });
       setLegendData({
        legendTitle: "Connection Error",
        narrative: "Failed to connect to the storytelling spirits. Please check your connection and try again.",
        imageUri: "https://placehold.co/600x400.png?text=Error+Fetching",
        visualPrompt: "error connection"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const imageHint = legendData?.visualPrompt || (legendData?.legendTitle ? legendData.legendTitle.toLowerCase().split(" ").slice(0,2).join(" ") : "folklore story");


  return (
    <Card className={cn(glassCardClasses, "w-full border-yellow-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <BookOpenTextIcon className="w-6 h-6 mr-2 text-yellow-400" />
          AI Local Legend & Folklore Narrator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Unearth captivating local stories, folklore, and hidden histories from your chosen destinations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="legend-destination" className="text-card-foreground/90">Destination *</Label>
            <Input
              id="legend-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Kyoto, Japan or Salem, Massachusetts"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
          <div>
            <Label htmlFor="legend-landmark" className="text-card-foreground/90">Specific Landmark or Area (Optional)</Label>
            <Input
              id="legend-landmark"
              value={landmarkOrContext}
              onChange={(e) => setLandmarkOrContext(e.target.value)}
              placeholder="e.g., Fushimi Inari Shrine or The Witch House"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-yellow-400" />
            <p>Aura is consulting the ancient spirits and local chronicles...</p>
          </div>
        )}

        {legendData && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg text-accent flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2" />
                {legendData.legendTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {legendData.imageUri && (
                 <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
                    <Image
                        src={legendData.imageUri}
                        alt={`Visual for ${legendData.legendTitle}`}
                        fill
                        className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={imageHint}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                 </div>
              )}
              {!legendData.imageUri && (
                <div className="aspect-video w-full bg-muted/50 flex items-center justify-center rounded-md mb-3 border border-border/30">
                    <ImageOffIcon className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <ScrollArea className="max-h-60">
                <p className="text-sm text-card-foreground/90 whitespace-pre-line leading-relaxed pr-3">{legendData.narrative}</p>
              </ScrollArea>
              {legendData.historicalContext && (
                <div className="pt-2 mt-2 border-t border-border/30">
                  <h4 className="text-xs font-semibold text-card-foreground mb-0.5 flex items-center"><InfoIcon className="w-3 h-3 mr-1.5 text-primary" />Historical Context:</h4>
                  <p className="text-xs text-muted-foreground italic pl-5">{legendData.historicalContext}</p>
                </div>
              )}
              {legendData.relatedLandmarks && legendData.relatedLandmarks.length > 0 && (
                <div className="pt-2 mt-2 border-t border-border/30">
                  <h4 className="text-xs font-semibold text-card-foreground mb-1 flex items-center"><LandmarkIcon className="w-3 h-3 mr-1.5 text-primary" />Related Landmarks:</h4>
                  <div className="flex flex-wrap gap-1.5 pl-5">
                    {legendData.relatedLandmarks.map((landmark, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{landmark}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleFetchLegend}
          disabled={isLoading || !destination.trim()}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Uncover Local Legends
        </Button>
      </CardFooter>
    </Card>
  );
}
