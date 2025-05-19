
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2Icon, SparklesIcon, MapPinIcon, SearchIcon, LightbulbIcon, TrendingUpIcon, UsersIcon, ClockIcon } from 'lucide-react';
import { getLocalInsiderTips, LocalInsiderTipsInput, LocalInsiderTipsOutput } from '@/ai/flows/local-insider-tips-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export function LocalInsiderTipsCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [tipsData, setTipsData] = useState<LocalInsiderTipsOutput | null>(null);
  const { toast } = useToast();

  const demoDestination = "Paris, France";
  const demoMood = "curious and adventurous";
  const demoWeather = "a pleasant sunny afternoon";

  const handleFetchTips = async () => {
    setIsLoading(true);
    setTipsData(null);
    try {
      const input: LocalInsiderTipsInput = {
        destination: demoDestination,
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
    <Card className={cn("glass-card w-full border-accent/30", "animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <MapPinIcon className="w-6 h-6 mr-2 text-accent" />
          Aura Local Lens: Insider Tips
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Discover what's buzzing, hidden gems, and daily picks, as if you have a local friend everywhere! (Demo for {demoDestination})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!tipsData && !isLoading && (
          <p className="text-sm text-center text-muted-foreground py-4">
            Click the button below to get today's AI-powered insider scoop for {demoDestination}, tailored for a "{demoMood}" mood and "{demoWeather}".
          </p>
        )}

        {isLoading && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-accent" />
            <p>Aura is tuning into local vibes...</p>
          </div>
        )}

        {tipsData && !isLoading && (
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-card-foreground mb-1 flex items-center">
                <TrendingUpIcon className="w-4 h-4 mr-2 text-primary" />
                Trending Spots Summary:
              </h4>
              <p className="text-muted-foreground pl-6 text-xs italic">{tipsData.trendingSpotsSummary}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-card-foreground mb-1 flex items-center">
                <SearchIcon className="w-4 h-4 mr-2 text-primary" />
                Hidden Gem Pick: {tipsData.hiddenGemPick.name}
              </h4>
              <p className="text-muted-foreground pl-6 text-xs">{tipsData.hiddenGemPick.description}</p>
              <p className="text-muted-foreground pl-6 text-xs mt-0.5"><span className="font-medium text-primary/80">Why it fits:</span> {tipsData.hiddenGemPick.reason}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-card-foreground mb-1 flex items-center">
                <LightbulbIcon className="w-4 h-4 mr-2 text-primary" />
                Daily Activity Pick: {tipsData.dailyActivityPick.name}
              </h4>
              <p className="text-muted-foreground pl-6 text-xs">{tipsData.dailyActivityPick.description}</p>
              <p className="text-muted-foreground pl-6 text-xs mt-0.5"><span className="font-medium text-primary/80">Why it fits:</span> {tipsData.dailyActivityPick.reason}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold text-card-foreground mb-1 flex items-center">
                <ClockIcon className="w-4 h-4 mr-2 text-primary" />
                Availability Notes:
              </h4>
              <p className="text-muted-foreground pl-6 text-xs italic">{tipsData.availabilityNotes}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleFetchTips}
          disabled={isLoading}
          className="w-full glass-interactive border-accent/50 text-accent hover:bg-accent/20 hover:text-accent-foreground"
          variant="outline"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Get Today's Scoop for {demoDestination.split(',')[0]}!
        </Button>
      </CardFooter>
    </Card>
  );
}
