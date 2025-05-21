
"use client";

import type { PriceTrackerEntry, PriceForecast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaneIcon, HotelIcon, DollarSignIcon, TagIcon, Trash2Icon, RefreshCwIcon, BellIcon, SparklesIcon, Loader2Icon, TrendingUpIcon, LineChartIcon, CalendarIcon, MapPinIcon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { trackPrice, PriceTrackerInput, PriceTrackerOutput } from "@/ai/flows/price-tracker";
import { getPriceAdvice, PriceAdvisorInput as AIPAdInput } from "@/ai/flows/price-advisor-flow"; 
import { getPriceForecast, PriceForecastInput as AIPFInput } from "@/ai/flows/price-forecast-flow.ts";
import React from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PriceForecastChart } from "./PriceForecastChart"; 

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
  
  const [isPriceForecastLoading, setIsPriceForecastLoading] = React.useState(false);
  const [isForecastChartDialogOpen, setIsForecastChartDialogOpen] = React.useState(false);
  const [simulatedChartData, setSimulatedChartData] = React.useState<Array<{ time: string; price: number | null }>>([]);


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
      const adviceInput: AIPAdInput = {
        itemType: item.itemType,
        itemName: item.itemName,
        originCity: item.itemType === 'flight' ? item.originCity : undefined,
        destination: item.destination,
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

  const generateSimulatedChartData = (currentPrice: number, forecastText: string | undefined): Array<{ time: string; price: number | null }> => {
    const data: Array<{ time: string; price: number | null }> = [
      { time: "Past 2W", price: Math.round(currentPrice * (1 + (Math.random() - 0.5) * 0.1) * 100)/100 }, 
      { time: "Past 1W", price: Math.round(currentPrice * (1 + (Math.random() - 0.5) * 0.05) * 100)/100 }, 
      { time: "Now", price: currentPrice },
    ];

    let trendFactor = 0; 
    if (forecastText) {
        if (forecastText.toLowerCase().includes("rise") || forecastText.toLowerCase().includes("increase")) trendFactor = 0.03;
        else if (forecastText.toLowerCase().includes("drop") || forecastText.toLowerCase().includes("decrease")) trendFactor = -0.03;
        else if (forecastText.toLowerCase().includes("stable") || forecastText.toLowerCase().includes("moderate")) trendFactor = 0.005;
    }
    
    for (let i = 1; i <= 3; i++) { 
        const prevPrice = data[data.length -1].price ?? currentPrice;
        let nextPrice = prevPrice * (1 + trendFactor * i + (Math.random() - 0.5) * 0.02); 
        nextPrice = Math.max(0, nextPrice); 
        data.push({ time: `Future ${i}W`, price: Math.round(nextPrice * 100) / 100});
    }
    return data;
  };


  const handleGetPriceForecast = async () => {
    setIsPriceForecastLoading(true);
    setSimulatedChartData([]); 
    try {
      const forecastInput: AIPFInput = {
        itemType: item.itemType,
        itemName: item.itemName,
        originCity: item.itemType === 'flight' ? item.originCity : undefined,
        destination: item.destination,
        currentPrice: item.currentPrice,
        travelDates: item.travelDates || "Not specified",
      };
      const result = await getPriceForecast(forecastInput);
      const newForecast: PriceForecast = {
        forecast: result.forecast,
        confidence: result.confidence,
        forecastedAt: new Date().toISOString(),
      };
      await onUpdateItem(item.id, { priceForecast: newForecast, lastChecked: new Date().toISOString() });
      
      const chartData = generateSimulatedChartData(item.currentPrice, result.forecast);
      setSimulatedChartData(chartData);

      toast({
        title: "AI Price Forecast Received",
        description: "Check the forecast below. Click 'View Trend' for a visual.",
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
    <>
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
          <p className="flex items-center"><TagIcon className="w-4 h-4 mr-2 text-muted-foreground" />Type: <span className="font-medium ml-1 capitalize">{item.itemType}</span></p>
          {item.itemType === 'flight' && item.originCity && <p className="flex items-center"><MapPinIcon className="w-4 h-4 mr-2 text-muted-foreground" />Origin: <span className="font-medium ml-1">{item.originCity}</span></p>}
          {item.destination && <p className="flex items-center"><MapPinIcon className="w-4 h-4 mr-2 text-muted-foreground" />{item.itemType === 'hotel' ? 'Location' : 'Destination'}: <span className="font-medium ml-1">{item.destination}</span></p>}
          {item.travelDates && <p className="flex items-center"><CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />Dates: <span className="font-medium ml-1">{item.travelDates}</span></p>}
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
        <CardFooter className="grid grid-cols-2 gap-2 pt-3">
          <Button onClick={handleGetAiAdvice} variant="outline" size="sm" className="w-full glass-interactive" disabled={isCurrentlyUpdating}>
              {isAiAdviceLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
              Advice
          </Button>
          <Button onClick={handleGetPriceForecast} variant="outline" size="sm" className="w-full glass-interactive" disabled={isCurrentlyUpdating}>
              {isPriceForecastLoading ? <Loader2Icon className="animate-spin" /> : <TrendingUpIcon />}
              Forecast
          </Button>
          {simulatedChartData.length > 0 && item.priceForecast && (
              <Button onClick={() => setIsForecastChartDialogOpen(true)} variant="outline" size="sm" className="w-full glass-interactive col-span-2" disabled={isCurrentlyUpdating}>
                  <LineChartIcon />
                  View Trend Graph
              </Button>
          )}
           <Button onClick={() => { setNewCurrentPrice(item.currentPrice.toString()); setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(true); }} variant="outline" size="sm" className="w-full glass-interactive" disabled={isCurrentlyUpdating}>
            <RefreshCwIcon className="mr-2 h-4 w-4" /> Re-check
          </Button>
          <Button onClick={() => onRemoveItem(item.id)} variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" disabled={isRemoving || isCurrentlyUpdating}>
            {isRemoving ? <Loader2Icon className="animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
             <span className="ml-2">Remove</span>
          </Button>
        </CardFooter>
      </Card> 

      <Dialog open={isRecheckDialogOpen} onOpenChange={setIsRecheckDialogOpen}>
        <DialogContent className={cn(glassEffectClasses)}>
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
                className="col-span-3 bg-background/70 dark:bg-input/50 border-border/70 focus:bg-input/90"
                placeholder={item.currentPrice.toString()}
              />
            </div>
            {recheckDialogAiAlert && (
              <Alert className={cn("mt-2 bg-card/80 backdrop-blur-sm", recheckDialogAiAlert.shouldAlert ? 'border-green-500/70 text-green-400' : 'border-blue-500/70 text-blue-400')}>
                <BellIcon className={cn("h-4 w-4", recheckDialogAiAlert.shouldAlert ? 'text-green-500' : 'text-blue-500')} />
                <AlertTitle className="text-card-foreground">{recheckDialogAiAlert.shouldAlert ? "Price Alert!" : "Price Update"}</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {recheckDialogAiAlert.alertMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(false);}} className="glass-interactive bg-card/70 hover:bg-muted/20 border-border/70">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRecheckPriceSubmit} disabled={isRecheckingPriceAI || isUpdating} className="shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
              {isRecheckingPriceAI ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
              Check Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isForecastChartDialogOpen} onOpenChange={setIsForecastChartDialogOpen}>
        <DialogContent className={cn(glassEffectClasses, "sm:max-w-xl md:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle className="text-card-foreground flex items-center">
              <LineChartIcon className="mr-2 h-5 w-5 text-purple-400" />
              Price Trend for {item.itemName}{item.destination ? ` in ${item.destination}` : ''}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Illustrative trend based on AI forecast. Current: ${item.currentPrice.toLocaleString()}, Target: ${item.targetPrice.toLocaleString()}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {item.priceForecast?.forecast && (
                <Alert variant="default" className="mb-4 p-2.5 text-xs border-purple-500/30 bg-purple-500/10 text-card-foreground">
                    <TrendingUpIcon className="h-4 w-4 text-purple-400" />
                    <AlertTitle className="text-xs font-semibold text-purple-400 mb-0.5">AI Forecast ({formatDistanceToNow(new Date(item.priceForecast.forecastedAt), { addSuffix: true })})</AlertTitle>
                    <AlertDescription className="text-xs">
                        {item.priceForecast.forecast}
                        {item.priceForecast.confidence && <span className="capitalize"> (Confidence: {item.priceForecast.confidence})</span>}
                    </AlertDescription>
                </Alert>
            )}
            {simulatedChartData.length > 0 ? (
              <PriceForecastChart
                chartData={simulatedChartData}
                currentPrice={item.currentPrice}
                targetPrice={item.targetPrice}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center">No chart data available. Generate a forecast first.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="glass-interactive bg-card/70 hover:bg-muted/20 border-border/70">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

