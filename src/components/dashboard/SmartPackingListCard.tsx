
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Briefcase, Info, ListChecks } from 'lucide-react';
import { getPackingList, PackingListInput, PackingListOutput } from '@/ai/flows/packing-list-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function SmartPackingListCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [packingList, setPackingList] = useState<string[] | null>(null);
  const [destination, setDestination] = useState('');
  const [travelDates, setTravelDates] = useState('');
  const [tripDuration, setTripDuration] = useState('');
  const [tripType, setTripType] = useState('');
  const [weatherContext, setWeatherContext] = useState('');
  const { toast } = useToast();

  const handleFetchPackingList = async () => {
    if (!destination.trim() || !travelDates.trim() || !tripDuration.trim()) {
      toast({
        title: "Input Required",
        description: "Please provide Destination, Travel Dates, and Trip Duration.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setPackingList(null);
    try {
      const input: PackingListInput = {
        destination,
        travelDates,
        tripDuration,
        tripType: tripType || undefined,
        weatherContext: weatherContext || undefined,
      };
      const result: PackingListOutput = await getPackingList(input);
      setPackingList(result.packingList);
    } catch (error) {
      console.error("Error fetching packing list:", error);
      toast({
        title: "Error Fetching Packing List",
        description: "Could not get packing list at this moment. Please try again later.",
        variant: "destructive",
      });
      setPackingList(["Failed to generate packing list."]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(glassCardClasses, "w-full border-green-500/30", "animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <Briefcase className="w-6 h-6 mr-2 text-green-400" />
          AI Smart Packing List Generator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Tell Aura AI about your trip, and it will suggest what to pack!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pack-destination" className="text-card-foreground/90">Destination *</Label>
            <Input id="pack-destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g., Paris, France" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
          </div>
          <div>
            <Label htmlFor="pack-travelDates" className="text-card-foreground/90">Travel Dates *</Label>
            <Input id="pack-travelDates" value={travelDates} onChange={(e) => setTravelDates(e.target.value)} placeholder="e.g., December 10-17" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
          </div>
          <div>
            <Label htmlFor="pack-tripDuration" className="text-card-foreground/90">Trip Duration *</Label>
            <Input id="pack-tripDuration" value={tripDuration} onChange={(e) => setTripDuration(e.target.value)} placeholder="e.g., 7 days" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
          </div>
          <div>
            <Label htmlFor="pack-tripType" className="text-card-foreground/90">Type of Trip (Optional)</Label>
            <Input id="pack-tripType" value={tripType} onChange={(e) => setTripType(e.target.value)} placeholder="e.g., Beach vacation, Hiking" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
          </div>
        </div>
        <div>
            <Label htmlFor="pack-weatherContext" className="text-card-foreground/90">Weather Context (Optional)</Label>
            <Textarea id="pack-weatherContext" value={weatherContext} onChange={(e) => setWeatherContext(e.target.value)} placeholder="e.g., Sunny and hot, Rainy season, Cold with snow" className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
        </div>

        <Button
          onClick={handleFetchPackingList}
          disabled={isLoading || !destination.trim() || !travelDates.trim() || !tripDuration.trim()}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Generate Packing List
        </Button>

        {isLoading && !packingList && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-green-400" />
            <p>Aura is thoughtfully preparing your packing list...</p>
          </div>
        )}

        {packingList && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
                <CardTitle className="text-lg text-accent flex items-center">
                    <ListChecks className="w-5 h-5 mr-2" />
                    Your AI-Suggested Packing List:
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="list-disc space-y-1 pl-5 text-sm text-card-foreground/90 max-h-60 overflow-y-auto">
                    {packingList.map((item, index) => (
                    <li key={index}>{item}</li>
                    ))}
                </ul>
            </CardContent>
          </Card>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
            <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            This AI generates a conceptual packing list. Always consider specific local conditions and personal needs.
          </p>
       </CardFooter>
    </Card>
  );
}
