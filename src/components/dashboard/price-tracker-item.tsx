
"use client";

import type { PriceTrackerEntry, PriceForecast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaneIcon, HotelIcon, DollarSignIcon, TagIcon, Trash2Icon, RefreshCwIcon, BellIcon, SparklesIcon, Loader2Icon, TrendingUpIcon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { trackPrice, PriceTrackerInput, PriceTrackerOutput } from "@/ai/flows/price-tracker";
import { getPriceAdvice, PriceAdvisorInput, PriceAdvisorOutput } from "@/ai/flows/price-advisor-flow"; 
import { getPriceForecast, PriceForecastInput as AIPFInput } from "@/ai/flows/price-forecast-flow"; // New import
import React from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type PriceTrackerItemProps = {
  item: PriceTrackerEntry;
  onRemoveItem: (itemId: string) => Promise<void>; 
  onUpdateItem: (itemId: string, dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>>) => Promise<void>; 
  isUpdating?: boolean;
  isRemoving?: boolean;
};

const glassEffectClasses = "glass-card";

export function PriceTrackerItem({ item, onRemoveItem, onUpdateItem, isUpdating, isRemoving }: PriceTrackerItemProps) {
  const { toast } = useToast();
  const [isRecheckingPriceAI, setIsRecheckingPriceAI] = React.useState(false);
  const [newCurrentPrice, setNewCurrentPrice] = React.useState<string>(item.currentPrice.toString());
  const [isRecheckDialogOpen, setIsRecheckDialogOpen] = React.useState(false);
  const [recheckDialogAiAlert, setRecheckDialogAiAlert] = React.useState<PriceTrackerOutput | null>(null);
  const [isAiAdviceLoading, setIsAiAdviceLoading] = React.useState(false);
  const [isPriceForecastLoading, setIsPriceForecastLoading] = React.useState(false); // New state for forecast


  const handleRecheckPriceSubmit = async () => {
    const currentPriceNum = parseFloat(newCurrentPrice);
    if (isNaN(currentPriceNum) || currentPriceNum <= 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid current price.", variant: "destructive" });
      return;
    }

    setIsRecheckingPriceAI(true);
    setRecheckDialogAiAlert(null);
    try {
      const input: PriceTrackerInput = {
        itemType: item.itemType,
        itemName: item.itemName,
        targetPrice: item.targetPrice,
        currentPrice: currentPriceNum,
      };
      const alertResult = await trackPrice(input);
      setRecheckDialogAiAlert(alertResult); 
      
      const dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>> = {
        currentPrice: currentPriceNum,
        alertStatus: alertResult,
        lastChecked: new Date().toISOString(),
      };
      await onUpdateItem(item.id, dataToUpdate); 

      toast({
        title: "Price Re-checked",
        description: `Latest price for ${item.itemName} updated.`,
      });
      if (alertResult.shouldAlert) {
        toast({
          title: "Price Alert!",
          description: alertResult.alertMessage,
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Error re-checking price:", error);
      toast({ title: "Error", description: "Could not re-check price.", variant: "destructive" });
    } finally {
      setIsRecheckingPriceAI(false);
    }
  };

  const handleGetAiAdvice = async () => {
    setIsAiAdviceLoading(true);
    try {
      const adviceInput: PriceAdvisorInput = {
        itemType: item.itemType,
        itemName: item.itemName,
        targetPrice: item.targetPrice,
        currentPrice: item.currentPrice,
      };
      const result = await getPriceAdvice(adviceInput);
      await onUpdateItem(item.id, { aiAdvice: result.advice, lastChecked: new Date().toISOString() });
      toast({
        title: "AI Advice Received",
        description: "Check the insights below.",
      });
    } catch (error) {
      console.error("Error getting AI advice:", error);
      toast({ title: "Error", description: "Could not fetch AI advice.", variant: "destructive" });
    } finally {
      setIsAiAdviceLoading(false);
    }
  };

  const handleGetPriceForecast = async () => {
    setIsPriceForecastLoading(true);
    try {
      const forecastInput: AIPFInput = {
        itemType: item.itemType,
        itemName: item.itemName,
        currentPrice: item.currentPrice,
        travelDates: item.itemName, // Using itemName as a proxy for dates, might need refinement
      };
      const result = await getPriceForecast(forecastInput);
      const newForecast: PriceForecast = {
        forecast: result.forecast,
        confidence: result.confidence,
        forecastedAt: new Date().toISOString(),
      };
      await onUpdateItem(item.id, { priceForecast: newForecast, lastChecked: new Date().toISOString() });
      toast({
        title: "AI Price Forecast Received",
        description: "Check the forecast below.",
      });
    } catch (error) {
      console.error("Error getting AI price forecast:", error);
      toast({ title: "Error", description: "Could not fetch AI price forecast.", variant: "destructive" });
    } finally {
      setIsPriceForecastLoading(false);
    }
  };
  
  const Icon = item.itemType === 'flight' ? PlaneIcon : HotelIcon;
  const isCurrentlyUpdating = isUpdating || isRecheckingPriceAI || isAiAdviceLoading || isPriceForecastLoading;

  return (
    <Card className={cn(glassEffectClasses, "flex flex-col border-primary/20")}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center text-md text-card-foreground">
            <Icon className="w-5 h-5 mr-2 text-primary" />
            {item.itemName}
          </CardTitle>
          <Badge variant={item.alertStatus?.shouldAlert ? "destructive" : "outline"} className={cn("whitespace-nowrap", item.alertStatus?.shouldAlert ? 'bg-destructive text-destructive-foreground shadow-md shadow-destructive/40' : 'bg-card/70 text-muted-foreground border-border/50')}>
            {item.alertStatus?.shouldAlert ? <><BellIcon className="w-3 h-3 mr-1"/> Alert!</> : "Tracking"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Last updated: {item.lastChecked ? formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true }) : 'Never'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 flex-grow text-card-foreground/90">
        <p className="flex items-center"><TagIcon className="w-4 h-4 mr-2 text-muted-foreground" />Type: <span className="font-medium ml-1">{item.itemType}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Target: <span className="font-medium ml-1">${item.targetPrice.toLocaleString()}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Current: <span className="font-medium ml-1">${item.currentPrice.toLocaleString()}</span></p>
        
        {item.alertStatus && (
             <Alert variant={item.alertStatus.shouldAlert ? "destructive" : "default"} className={cn("p-2.5 text-xs", item.alertStatus.shouldAlert ? 'bg-destructive/20 border-destructive/50 text-destructive-foreground' : 'bg-primary/10 border-primary/30 text-card-foreground')}>
                <BellIcon className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold mb-0.5">{item.alertStatus.shouldAlert ? "Action Recommended!" : "Status"}</AlertTitle>
                <AlertDescription className="text-xs">
                  {item.alertStatus.alertMessage}
                </AlertDescription>
              </Alert>
        )}

        {(isAiAdviceLoading || (isCurrentlyUpdating && !item.aiAdvice && !item.priceForecast)) && (
          <div className="flex items-center justify-center p-3 bg-muted/30 rounded-md">
            <Loader2Icon className="w-5 h-5 mr-2 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">AI is working...</span>
          </div>
        )}

        {item.aiAdvice && !isAiAdviceLoading && (
          <Alert variant="default" className="p-2.5 text-xs border-accent/30 bg-accent/10 text-card-foreground transition-opacity duration-300">
            <SparklesIcon className="h-4 w-4 text-accent" />
            <AlertTitle className="text-xs font-semibold text-accent mb-0.5">AI Price Advisor</AlertTitle>
            <AlertDescription className="text-xs">
              {item.aiAdvice}
            </AlertDescription>
          </Alert>
        )}

        {isPriceForecastLoading && !item.priceForecast && (
             <div className="flex items-center justify-center p-3 bg-muted/30 rounded-md mt-2">
                <Loader2Icon className="w-5 h-5 mr-2 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Generating price forecast...</span>
            </div>
        )}

        {item.priceForecast && !isPriceForecastLoading && (
            <Alert variant="default" className="mt-2 p-2.5 text-xs border-purple-500/30 bg-purple-500/10 text-card-foreground transition-opacity duration-300">
                <TrendingUpIcon className="h-4 w-4 text-purple-400" />
                <AlertTitle className="text-xs font-semibold text-purple-400 mb-0.5">AI Price Forecast <span className="text-muted-foreground text-xs">({formatDistanceToNow(new Date(item.priceForecast.forecastedAt), { addSuffix: true })})</span></AlertTitle>
                <AlertDescription className="text-xs">
                {item.priceForecast.forecast}
                {item.priceForecast.confidence && <span className="capitalize text-muted-foreground/80"> (Confidence: {item.priceForecast.confidence})</span>}
                </AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-3">
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 mb-2 sm:mb-0">
            <Button onClick={handleGetAiAdvice} variant="outline" size="sm" className="w-full sm:w-auto flex-1 bg-card/70 hover:bg-accent/20 border-border/70 text-accent hover:text-accent-foreground" disabled={isCurrentlyUpdating}>
                {isAiAdviceLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
                AI Advice
            </Button>
            <Button onClick={handleGetPriceForecast} variant="outline" size="sm" className="w-full sm:w-auto flex-1 bg-card/70 hover:bg-purple-500/20 border-border/70 text-purple-400 hover:text-purple-300" disabled={isCurrentlyUpdating}>
                {isPriceForecastLoading ? <Loader2Icon className="animate-spin" /> : <TrendingUpIcon />}
                Get Forecast
            </Button>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
            <Button onClick={() => { setNewCurrentPrice(item.currentPrice.toString()); setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(true); }} variant="outline" size="sm" className="flex-1 bg-card/70 hover:bg-primary/20 border-border/70 text-primary hover:text-primary-foreground" disabled={isCurrentlyUpdating}>
              <RefreshCwIcon className="mr-2 h-4 w-4" /> Re-check
            </Button>
            <Button onClick={() => onRemoveItem(item.id)} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground px-2" disabled={isRemoving || isCurrentlyUpdating}>
              {isRemoving ? <Loader2Icon className="animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
            </Button>
        </div>
      </CardFooter>

      <Dialog open={isRecheckDialogOpen} onOpenChange={setIsRecheckDialogOpen}>
        <DialogContent className={cn(glassEffectClasses, "border-primary/30")}>
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Re-check Price for {item.itemName}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the new current price to get an updated AI analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCurrentPrice" className="text-right col-span-1 text-card-foreground/90">
                New Price
              </Label>
              <Input
                id="newCurrentPrice"
                type="number"
                value={newCurrentPrice}
                onChange={(e) => setNewCurrentPrice(e.target.value)}
                className="col-span-3 bg-background/70 dark:bg-input border-border/70 focus:bg-input/90"
                placeholder={item.currentPrice.toString()}
              />
            </div>
             {recheckDialogAiAlert && (
              <Alert className={`mt-2 ${recheckDialogAiAlert.shouldAlert ? 'border-green-500/70 text-green-400' : 'border-blue-500/70 text-blue-400'} bg-card/80 backdrop-blur-sm`}>
                <BellIcon className={`h-4 w-4 ${recheckDialogAiAlert.shouldAlert ? 'text-green-500' : 'text-blue-500'}`} />
                <AlertTitle className="text-card-foreground">{recheckDialogAiAlert.shouldAlert ? "Price Alert!" : "Price Update"}</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {recheckDialogAiAlert.alertMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(false);}} className="bg-card/70 hover:bg-muted/20 border-border/70">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRecheckPriceSubmit} disabled={isRecheckingPriceAI || isUpdating} className="shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
              {isRecheckingPriceAI ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
              Check Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
