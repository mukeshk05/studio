
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, MapPin, Search, Lightbulb, TrendingUp, Clock, Info } from 'lucide-react';
import { getLocalInsiderTips, LocalInsiderTipsInput, LocalInsiderTipsOutput } from '@/ai/flows/local-insider-tips-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { LocalInsiderTipsDisplay } from '@/components/common/LocalInsiderTipsDisplay';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function LocalInsiderTipsCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [tipsData, setTipsData] = useState<LocalInsiderTipsOutput | null>(null);
  const [destination, setDestination] = useState(''); 
  const [lastFetchedDestination, setLastFetchedDestination] = useState('');
  const { toast } = useToast();

  const demoMood = "curious and adventurous";
  const demoWeather = "a pleasant sunny afternoon";

  const handleFetchTips = async () => {
    if (!destination.trim()) {
      toast({
        title: "Destination Required",
        description: "Please enter a destination to get insider tips.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setTipsData(null);
    setLastFetchedDestination(destination); 
    try {
      const input: LocalInsiderTipsInput = {
        destination: destination,
        desiredMood: demoMood,
        weatherContext: demoWeather,
      };
      const result = await getLocalInsiderTips(input);
      setTipsData(result);
    } catch (error) {
      console.error("Error fetching local insider tips:", error);
      toast({
        title: "Error Fetching Tips",
        description: "Could not get local insider tips at this moment. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(glassCardClasses, "w-full border-accent/30", "animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <MapPin className="w-6 h-6 mr-2 text-accent" />
          Aura Local Lens: Insider Tips
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter a destination to discover what's buzzing, hidden gems, and daily picks, tailored for a "{demoMood}" mood and "{demoWeather}".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="insider-destination" className="text-card-foreground/90">Destination</Label>
          <Input
            id="insider-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g., Tokyo, Japan or Rome, Italy"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
          />
        </div>

        {!tipsData && !isLoading && !lastFetchedDestination && (
          <p className="text-sm text-center text-muted-foreground py-4">
            Enter a destination and click the button below to get today's AI-powered insider scoop!
          </p>
        )}
         {!tipsData && !isLoading && lastFetchedDestination && (
           <p className="text-sm text-center text-muted-foreground py-4">
             No tips found for {lastFetchedDestination}. Try another destination or broaden your search.
           </p>
        )}


        {isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-accent" />
            <p>Aura is tuning into local vibes for {lastFetchedDestination}...</p>
          </div>
        )}

        {tipsData && !isLoading && lastFetchedDestination && (
          <div className="mt-4 animate-fade-in">
            <LocalInsiderTipsDisplay tipsData={tipsData} destinationName={lastFetchedDestination}/>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          onClick={handleFetchTips}
          disabled={isLoading || !destination.trim()}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Get Insider Tips!
        </Button>
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          AI simulates real-time local data. Actual availability may vary.
        </p>
      </CardFooter>
    </Card>
  );
}
