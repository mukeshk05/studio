
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, GitCompareArrows, ImageOff, Info, MapPin, Lightbulb } from 'lucide-react';
import { getWhatIfAnalysis } from "@/ai/flows/what-if-simulator-flow.ts";
import type { WhatIfSimulatorInput, WhatIfSimulatorOutput, DestinationAnalysis } from '@/ai/types/what-if-simulator-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

function DestinationAnalysisCard({ analysis, imageName }: { analysis: DestinationAnalysis; imageName: string }) {
  const imageHint = analysis.imageUri?.startsWith('https://placehold.co') 
    ? (analysis.imagePrompt || analysis.name.toLowerCase().split(" ").slice(0,2).join(" ")) 
    : undefined;

  return (
    <Card className={cn(innerGlassEffectClasses, "flex flex-col h-full")}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
          <MapPin className="w-4 h-4 mr-2 text-primary" />
          {analysis.name}
        </CardTitle>
      </CardHeader>
      {analysis.imageUri && (
        <div className="relative aspect-video w-full group">
          <Image
            src={analysis.imageUri}
            alt={`Image for ${analysis.name}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={imageHint}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      {!analysis.imageUri && (
        <div className="aspect-video w-full bg-muted/50 flex items-center justify-center">
          <ImageOff className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      <CardContent className="text-xs space-y-2 pt-3 flex-grow">
        <p><strong className="text-primary/90">Suitability:</strong> {analysis.suitabilityForInterest}</p>
        <p><strong className="text-primary/90">Vibe:</strong> {analysis.generalVibe}</p>
        <p><strong className="text-primary/90">Cost:</strong> <Badge variant="outline" className="text-xs border-primary/40 text-primary/90 bg-primary/5">{analysis.costExpectation}</Badge></p>
        {analysis.keyHighlights && analysis.keyHighlights.length > 0 && (
          <div>
            <h5 className="font-medium text-card-foreground mb-0.5">Key Highlights:</h5>
            <ul className="list-disc list-inside pl-1 space-y-0.5 text-muted-foreground">
              {analysis.keyHighlights.map((hl, i) => <li key={i}>{hl}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export function WhatIfSimulatorPlaceholder() {
  const [destination1, setDestination1] = useState('');
  const [destination2, setDestination2] = useState('');
  const [travelInterest, setTravelInterest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<WhatIfSimulatorOutput | null>(null);
  const { toast } = useToast();

  const handleCompareDestinations = async () => {
    if (!destination1.trim() || !destination2.trim()) {
      toast({ title: "Input Required", description: "Please enter both destinations.", variant: "destructive" });
      return;
    }
    if (!travelInterest.trim()) {
      toast({ title: "Input Required", description: "Please enter your travel interest.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const input: WhatIfSimulatorInput = {
        destination1,
        destination2,
        travelInterest,
      };
      const result = await getWhatIfAnalysis(input);
      setAnalysisResult(result);
      if (!result || !result.comparisonSummary) {
         toast({
            title: "No Comparison Generated",
            description: `Aura couldn't generate a comparison for these inputs. Try different destinations or interests.`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error fetching 'What If' analysis:", error);
      toast({ title: "AI Error", description: "Could not get comparison. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(glassCardClasses, "w-full border-orange-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <GitCompareArrows className="w-6 h-6 mr-2 text-orange-400" />
          AI 'What If' Travel Simulator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Compare two destinations based on your travel interests and get AI-driven insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="destination1" className="text-card-foreground/90">Destination 1</Label>
            <Input
              id="destination1"
              value={destination1}
              onChange={(e) => setDestination1(e.target.value)}
              placeholder="e.g., Bali, Indonesia"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
          <div>
            <Label htmlFor="destination2" className="text-card-foreground/90">Destination 2</Label>
            <Input
              id="destination2"
              value={destination2}
              onChange={(e) => setDestination2(e.target.value)}
              placeholder="e.g., Phuket, Thailand"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="travelInterest" className="text-card-foreground/90">Primary Travel Interest / Trip Type</Label>
          <Input
            id="travelInterest"
            value={travelInterest}
            onChange={(e) => setTravelInterest(e.target.value)}
            placeholder="e.g., Relaxing beach vacation, Adventure & hiking, Cultural immersion"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
          />
        </div>

        <Button
          onClick={handleCompareDestinations}
          disabled={isLoading || !destination1.trim() || !destination2.trim() || !travelInterest.trim()}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Compare Destinations with AI
        </Button>

        {isLoading && !analysisResult && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-orange-400" />
            <p>Aura is simulating and comparing your options...</p>
          </div>
        )}

        {analysisResult && !isLoading && (
          <div className="mt-6 space-y-5">
            <Separator className="bg-orange-500/30" />
            
            <div className={cn("p-3 rounded-md text-sm italic", innerGlassEffectClasses, "border-primary/20 bg-primary/5")}>
                <Info className="w-4 h-4 mr-1.5 text-primary float-left mt-0.5" />
                <strong className="text-primary/90">AI Comparison Summary:</strong> {analysisResult.comparisonSummary}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.destination1Analysis && (
                <DestinationAnalysisCard analysis={analysisResult.destination1Analysis} imageName="Destination 1" />
              )}
              {analysisResult.destination2Analysis && (
                <DestinationAnalysisCard analysis={analysisResult.destination2Analysis} imageName="Destination 2" />
              )}
            </div>
            
            {analysisResult.aiRecommendation && (
              <div className={cn("mt-4 p-3 rounded-md", innerGlassEffectClasses, "border-accent/20 bg-accent/5")}>
                <h4 className="text-sm font-semibold text-accent mb-1 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1.5" />
                  Aura's Recommendation:
                </h4>
                <p className="text-xs italic text-muted-foreground">{analysisResult.aiRecommendation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full">
            This feature uses live AI calls for comparison and image generation.
          </p>
       </CardFooter>
    </Card>
  );
}
