
"use client";

import type { PriceTrackerEntry, PriceForecast } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Hotel, DollarSign, Tag, Trash2, RefreshCw, Bell, Sparkles, Loader2, TrendingUp, LineChart, CalendarDays, MapPin, CheckCircle, Info } from "lucide-react";
import { format, formatDistanceToNow, parseISO, addMonths, startOfMonth } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { trackPrice, PriceTrackerInput, PriceTrackerOutput } from "@/ai/flows/price-tracker";
import { getPriceAdvice, PriceAdvisorInput as AIPAdInput } from "@/ai/flows/price-advisor-flow"; 
import { getPriceForecast, PriceForecastInput as AIPFInput } from "@/ai/flows/price-forecast-flow.ts";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PriceForecastChart } from "./PriceForecastChart"; 
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { getRealFlightsAction, getRealHotelsAction } from "@/app/actions";
import type { SerpApiFlightOption, SerpApiHotelSuggestion } from "@/ai/types/serpapi-flight-search-types";

type PriceTrackerItemProps = {
  item: PriceTrackerEntry;
  onRemoveItem: (itemId: string) => Promise<void>; 
  onUpdateItem: (itemId: string, dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>>) => Promise<void>; 
  isUpdating?: boolean;
  isRemoving?: boolean;
};

const glassEffectClasses = "glass-card";

// Helper to parse flexible dates or provide defaults for SerpApi calls
function parseFlexibleDatesForSerpApi(dateString?: string): { departureDate: string; returnDate?: string } {
    const now = new Date();
    let departure = addMonths(now, 1); // Default to next month
    let arrival = new Date(departure);
    arrival.setDate(departure.getDate() + 7); // Default 7-day trip

    if (dateString) {
        const parts = dateString.split(' - ');
        if (parts.length === 2) {
            try {
                const from = parseISO(parts[0]);
                const to = parseISO(parts[1]);
                if (!isNaN(from.valueOf()) && !isNaN(to.valueOf())) {
                    departure = from;
                    arrival = to;
                }
            } catch (e) { /* ignore, use defaults */ }
        } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            try {
                const singleDate = parseISO(dateString);
                 if (!isNaN(singleDate.valueOf())) {
                    departure = singleDate;
                    // For one-way or when only one date is given, SerpApi might need just departure_date
                    // Or we can assume a default duration for hotel checks.
                    // For now, let's assume if only one date, it's the start.
                 }
            } catch (e) { /* ignore */ }
        } else if (dateString.toLowerCase().includes("mid-december")) {
            departure = new Date(now.getFullYear(), 11, 15); // December 15th
            arrival = new Date(now.getFullYear(), 11, 22);
        } else if (dateString.toLowerCase().includes("next summer")) {
            departure = new Date(now.getFullYear() + (now.getMonth() >= 5 ? 1 : 0), 5, 1); // June 1st
            arrival = new Date(departure.getFullYear(), 7, 31); // August 31st
        }
        // Add more robust parsing for other descriptive dates if needed
    }
    return { 
        departureDate: format(departure, "yyyy-MM-dd"), 
        returnDate: arrival ? format(arrival, "yyyy-MM-dd") : undefined 
    };
}


export function PriceTrackerItem({ item, onRemoveItem, onUpdateItem, isUpdating, isRemoving }: PriceTrackerItemProps) {
  const { toast } = useToast();
  const [isRecheckingPriceAI, setIsRecheckingPriceAI] = React.useState(false);
  const [newCurrentPriceManualInput, setNewCurrentPriceManualInput] = React.useState<string>(item.currentPrice.toString());
  const [isRecheckDialogOpen, setIsRecheckDialogOpen] = React.useState(false);
  const [recheckDialogAiAlert, setRecheckDialogAiAlert] = React.useState<PriceTrackerOutput | null>(null);
  
  const [isAiAdviceLoading, setIsAiAdviceLoading] = React.useState(false);
  
  const [isPriceForecastLoading, setIsPriceForecastLoading] = React.useState(false);
  const [isForecastChartDialogOpen, setIsForecastChartDialogOpen] = React.useState(false);
  const [simulatedChartData, setSimulatedChartData] = React.useState<Array<{ time: string; price: number | null }>>([]);

  const [enableAutoBook, setEnableAutoBook] = useState(false);

  const handleAutoBookToggle = (checked: boolean) => {
    setEnableAutoBook(checked);
    toast({
      title: `Conceptual Auto-Book ${checked ? "Enabled" : "Disabled"}`,
      description: checked 
        ? `BudgetRoam would conceptually attempt to auto-book ${item.itemName} if the price hits $${item.targetPrice.toLocaleString()}.`
        : `Conceptual auto-booking for ${item.itemName} is now off.`,
      duration: 4000,
    });
  };

  const triggerClientSideNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: '/logo.png' }); // Assuming logo.png is in public
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body, icon: '/logo.png' });
          }
        });
      }
    }
  };
  
  const handleRecheckPriceSubmit = async (manualPriceInput?: string) => {
    setIsRecheckingPriceAI(true);
    setRecheckDialogAiAlert(null);
    let latestPrice: number | undefined = undefined;
    let priceSource = "manual input";
    let itemNameForAlert = item.itemName; // Default item name

    if (manualPriceInput) {
        const parsedManualPrice = parseFloat(manualPriceInput);
        if (!isNaN(parsedManualPrice) && parsedManualPrice > 0) {
            latestPrice = parsedManualPrice;
        } else {
            toast({ title: "Invalid Price", description: "Please enter a valid current price for manual update.", variant: "destructive" });
            setIsRecheckingPriceAI(false);
            return;
        }
    } else { 
        priceSource = "SerpApi";
        const parsedDates = parseFlexibleDatesForSerpApi(item.travelDates);
        
        try {
            if (item.itemType === "flight") {
                if (!item.originCity || !item.destination || !parsedDates.departureDate) {
                    toast({ title: "Flight Info Missing", description: "Origin, Destination, and Departure Date are needed for flight re-check.", variant: "destructive" });
                    setIsRecheckingPriceAI(false); return;
                }
                const flightResults = await getRealFlightsAction({
                    origin: item.originCity,
                    destination: item.destination,
                    departureDate: parsedDates.departureDate,
                    returnDate: parsedDates.returnDate,
                    tripType: parsedDates.returnDate ? "round-trip" : "one-way",
                });
                const potentialFlights = (flightResults.best_flights || []).concat(flightResults.other_flights || []);
                // Simplified matching: find any flight that has a similar name part or just take the cheapest
                const foundFlight = potentialFlights.find(f => 
                    (f.airline && item.itemName.toLowerCase().includes(f.airline.toLowerCase().split(" ")[0])) ||
                    (f.derived_flight_numbers && item.itemName.includes(f.derived_flight_numbers.split(",")[0]))
                ) || potentialFlights[0];

                if (foundFlight?.price) {
                    latestPrice = foundFlight.price;
                    itemNameForAlert = `${foundFlight.airline || item.itemName} to ${item.destination}`;
                } else {
                    toast({title: "No Price Update", description: `Could not find a current price for ${item.itemName} via SerpApi. The flight might no longer be available or parameters changed.`, variant: "default", duration: 7000});
                }

            } else if (item.itemType === "hotel") {
                if (!item.destination || !parsedDates.departureDate || !parsedDates.returnDate) {
                     toast({ title: "Hotel Info Missing", description: "Hotel location and check-in/out dates needed for re-check.", variant: "destructive" });
                     setIsRecheckingPriceAI(false); return;
                }
                const hotelResults = await getRealHotelsAction({
                    destination: item.destination,
                    checkInDate: parsedDates.departureDate,
                    checkOutDate: parsedDates.returnDate,
                    guests: "2", 
                });
                const foundHotel = hotelResults.hotels?.find(h => h.name?.toLowerCase().includes(item.itemName.toLowerCase()));
                if (foundHotel?.price_per_night) {
                    latestPrice = foundHotel.price_per_night; 
                     itemNameForAlert = foundHotel.name || item.itemName;
                } else if (hotelResults.hotels?.[0]?.price_per_night) {
                    latestPrice = hotelResults.hotels[0].price_per_night;
                    itemNameForAlert = hotelResults.hotels[0].name || item.itemName;
                    toast({title: "Note", description: "Could not find exact hotel, showing price for a similar option.", variant: "default"});
                } else {
                     toast({title: "No Price Update", description: `Could not find a current price for ${item.itemName} via SerpApi. The hotel might no longer be available for these dates.`, variant: "default", duration: 7000});
                }
            }
        } catch (apiError: any) {
            console.error("Error fetching latest price from SerpApi:", apiError);
            toast({ title: "SerpApi Error", description: `Could not fetch latest price: ${apiError.message}`, variant: "destructive" });
            setIsRecheckingPriceAI(false);
            return;
        }
    }

    if (latestPrice === undefined) {
        toast({ title: "Re-check Failed", description: `Could not determine the new price for ${itemNameForAlert} from ${priceSource}.`, variant: "destructive" });
        setIsRecheckingPriceAI(false);
        if (isRecheckDialogOpen && !manualPriceInput) setIsRecheckDialogOpen(false);
        return;
    }

    try {
      const alertInput: PriceTrackerInput = {
        itemType: item.itemType,
        itemName: itemNameForAlert, // Use potentially updated name
        targetPrice: item.targetPrice,
        currentPrice: latestPrice,
      };
      const alertResult = await trackPrice(alertInput);
      setRecheckDialogAiAlert(alertResult); 
      
      const dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>> = {
        currentPrice: latestPrice,
        alertStatus: alertResult,
        lastChecked: new Date().toISOString(),
        itemName: itemNameForAlert, // Update itemName if it was refined by SerpApi result
      };
      await onUpdateItem(item.id, dataToUpdate); 

      toast({
        title: "Price Re-checked",
        description: `Latest price for ${itemNameForAlert} (${priceSource}) updated to $${latestPrice.toLocaleString()}.`,
      });

      if (alertResult.shouldAlert) {
        const alertTitle = `Price Alert for ${itemNameForAlert}!`;
        const alertBody = alertResult.alertMessage;
        toast({ title: alertTitle, description: `${alertBody} (Conceptual email/push sent).`, duration: 10000 });
        triggerClientSideNotification(alertTitle, alertBody);
      }
      if (isRecheckDialogOpen && !manualPriceInput) setIsRecheckDialogOpen(false); 

    } catch (error) {
      console.error("Error processing price re-check:", error);
      toast({ title: "Error", description: "Could not update price tracker item.", variant: "destructive" });
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
  
  const IconComponent = item.itemType === 'flight' ? Plane : Hotel;
  const isCurrentlyUpdatingAnyAI = isUpdating || isRecheckingPriceAI || isAiAdviceLoading || isPriceForecastLoading;

  return (
    <>
      <Card className={cn(glassEffectClasses, "flex flex-col border-primary/20")}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="flex items-center text-md text-card-foreground">
              <IconComponent className="w-5 h-5 mr-2 text-primary" />
              {item.itemName}
            </CardTitle>
            <Badge variant={item.alertStatus?.shouldAlert ? "destructive" : "outline"} className={cn("whitespace-nowrap", item.alertStatus?.shouldAlert ? 'bg-destructive text-destructive-foreground shadow-md shadow-destructive/40' : 'bg-card/70 text-muted-foreground border-border/50')}>
              {item.alertStatus?.shouldAlert ? <><Bell className="w-3 h-3 mr-1"/> Alert!</> : "Tracking"}
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Last updated: {item.lastChecked ? formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true }) : 'Never'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2 flex-grow text-card-foreground/90">
          <p className="flex items-center"><Tag className="w-4 h-4 mr-2 text-muted-foreground" />Type: <span className="font-medium ml-1 capitalize">{item.itemType}</span></p>
          {item.itemType === 'flight' && item.originCity && <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-muted-foreground" />Origin: <span className="font-medium ml-1">{item.originCity}</span></p>}
          {item.destination && <p className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-muted-foreground" />{item.itemType === 'hotel' ? 'Location' : 'Destination'}: <span className="font-medium ml-1">{item.destination}</span></p>}
          {item.travelDates && <p className="flex items-center"><CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />Dates: <span className="font-medium ml-1">{item.travelDates}</span></p>}
          <p className="flex items-center"><DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />Target: <span className="font-medium ml-1">${item.targetPrice.toLocaleString()}</span></p>
          <p className="flex items-center"><DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />Current: <span className="font-medium ml-1">${item.currentPrice.toLocaleString()}</span></p>
          
          {item.alertStatus && (
              <Alert variant={item.alertStatus.shouldAlert ? "destructive" : "default"} className={cn("p-2.5 text-xs", item.alertStatus.shouldAlert ? 'bg-destructive/20 border-destructive/50 text-destructive-foreground' : 'bg-primary/10 border-primary/30 text-card-foreground')}>
                  <Bell className="h-4 w-4" />
                  <AlertTitle className="text-xs font-semibold mb-0.5">{item.alertStatus.shouldAlert ? "Action Recommended!" : "Status"}</AlertTitle>
                  <AlertDescription className="text-xs">
                    {item.alertStatus.alertMessage}
                    {item.alertStatus.shouldAlert && <span className="block mt-1 text-xs italic opacity-80">(Conceptual email/push sent. Check browser notifications if enabled.)</span>}
                  </AlertDescription>
                </Alert>
          )}

          {(isCurrentlyUpdatingAnyAI && !item.aiAdvice && !item.priceForecast) && (
            <div className="flex items-center justify-center p-3 bg-muted/30 rounded-md">
              <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">AI is working...</span>
            </div>
          )}

          {item.aiAdvice && !isAiAdviceLoading && (
            <Alert variant="default" className="p-2.5 text-xs border-accent/30 bg-accent/10 text-card-foreground transition-opacity duration-300">
              <Sparkles className="h-4 w-4 text-accent" />
              <AlertTitle className="text-xs font-semibold text-accent mb-0.5">AI Price Advisor</AlertTitle>
              <AlertDescription className="text-xs">
                {item.aiAdvice}
              </AlertDescription>
            </Alert>
          )}

          {isPriceForecastLoading && !item.priceForecast && (
              <div className="flex items-center justify-center p-3 bg-muted/30 rounded-md mt-2">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Generating price forecast...</span>
              </div>
          )}

          {item.priceForecast && !isPriceForecastLoading && (
              <Alert variant="default" className="mt-2 p-2.5 text-xs border-purple-500/30 bg-purple-500/10 text-card-foreground transition-opacity duration-300">
                  <TrendingUp className="h-4 w-4 text-purple-400" />
                  <AlertTitle className="text-xs font-semibold text-purple-400 mb-0.5">AI Price Forecast <span className="text-muted-foreground text-xs">({formatDistanceToNow(new Date(item.priceForecast.forecastedAt), { addSuffix: true })})</span></AlertTitle>
                  <AlertDescription className="text-xs">
                  {item.priceForecast.forecast}
                  {item.priceForecast.confidence && <span className="capitalize text-muted-foreground/80"> (Confidence: {item.priceForecast.confidence})</span>}
                  </AlertDescription>
              </Alert>
          )}

          <Separator className="my-3" />

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id={`auto-book-${item.id}`}
                checked={enableAutoBook}
                onCheckedChange={handleAutoBookToggle}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-input"
              />
              <Label htmlFor={`auto-book-${item.id}`} className="text-xs text-muted-foreground cursor-pointer">
                Enable Auto-Book if Target Price Met (Conceptual)
              </Label>
            </div>
            {enableAutoBook && (
              <Alert variant="default" className="p-2.5 text-xs border-green-500/30 bg-green-500/10 text-card-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-xs font-semibold text-green-600 dark:text-green-400 mb-0.5">Conceptual Auto-Book Enabled</AlertTitle>
                <AlertDescription className="text-xs">
                  If this were a live feature, BudgetRoam AI would attempt to automatically book this item for you if its price drops to or below your target of ${item.targetPrice.toLocaleString()}. This would require pre-configured payment methods and booking preferences (Future Vision).
                </AlertDescription>
              </Alert>
            )}
          </div>

        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-2 pt-3">
          <Button onClick={handleGetAiAdvice} variant="outline" size="sm" className="w-full glass-interactive" disabled={isCurrentlyUpdatingAnyAI}>
              {isAiAdviceLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Advice
          </Button>
          <Button onClick={handleGetPriceForecast} variant="outline" size="sm" className="w-full glass-interactive" disabled={isCurrentlyUpdatingAnyAI}>
              {isPriceForecastLoading ? <Loader2 className="animate-spin" /> : <TrendingUp />}
              Forecast
          </Button>
          {simulatedChartData.length > 0 && item.priceForecast && (
              <Button onClick={() => setIsForecastChartDialogOpen(true)} variant="outline" size="sm" className="w-full glass-interactive col-span-2" disabled={isCurrentlyUpdatingAnyAI}>
                  <LineChart />
                  View Trend Graph
              </Button>
          )}
           <Button onClick={() => { setNewCurrentPriceManualInput(item.currentPrice.toString()); setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(true); }} variant="outline" size="sm" className="w-full glass-interactive" disabled={isCurrentlyUpdatingAnyAI}>
            <RefreshCw className="mr-2 h-4 w-4" /> Re-check
          </Button>
          <Button onClick={() => onRemoveItem(item.id)} variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" disabled={isRemoving || isCurrentlyUpdatingAnyAI}>
            {isRemoving ? <Loader2 className="animate-spin" /> : <Trash2 className="h-4 w-4" />}
             <span className="ml-2">Remove</span>
          </Button>
        </CardFooter>
      </Card> 

      <Dialog open={isRecheckDialogOpen} onOpenChange={setIsRecheckDialogOpen}>
        <DialogContent className={cn(glassEffectClasses)}>
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Re-check Price for {item.itemName}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the new current price manually OR let AI try to fetch it via SerpApi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCurrentPriceManualInput" className="text-right col-span-1 text-card-foreground/90">
                Manual Price
              </Label>
              <Input
                id="newCurrentPriceManualInput"
                type="number"
                value={newCurrentPriceManualInput}
                onChange={(e) => setNewCurrentPriceManualInput(e.target.value)}
                className="col-span-3 bg-background/70 dark:bg-input/50 border-border/70 focus:bg-input/90"
                placeholder={item.currentPrice.toString()}
              />
            </div>
            {recheckDialogAiAlert && (
              <Alert className={cn("mt-2 bg-card/80 backdrop-blur-sm", recheckDialogAiAlert.shouldAlert ? 'border-green-500/70 text-green-400' : 'border-blue-500/70 text-blue-400')}>
                <Bell className={cn("h-4 w-4", recheckDialogAiAlert.shouldAlert ? 'text-green-500' : 'text-blue-500')} />
                <AlertTitle className="text-card-foreground">{recheckDialogAiAlert.shouldAlert ? "Price Alert!" : "Price Update"}</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  {recheckDialogAiAlert.alertMessage}
                  {recheckDialogAiAlert.shouldAlert && <span className="block mt-1 text-xs italic opacity-80">(Email/Push notification would be sent in a full system. Client notification was attempted.)</span>}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
             <Button variant="outline" onClick={() => handleRecheckPriceSubmit()} disabled={isRecheckingPriceAI || isUpdating} className="w-full sm:w-auto glass-interactive">
              {isRecheckingPriceAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Use SerpApi to Fetch
            </Button>
            <Button onClick={() => handleRecheckPriceSubmit(newCurrentPriceManualInput)} disabled={isRecheckingPriceAI || isUpdating} className="w-full sm:w-auto shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
              {isRecheckingPriceAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Update Manually
            </Button>
            <DialogClose asChild>
                <Button variant="ghost" onClick={() => {setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(false);}} className="w-full sm:w-auto glass-interactive bg-card/70 hover:bg-muted/20 border-border/70 mt-2 sm:mt-0">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isForecastChartDialogOpen} onOpenChange={setIsForecastChartDialogOpen}>
        <DialogContent className={cn(glassEffectClasses, "sm:max-w-xl md:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle className="text-card-foreground flex items-center">
              <LineChart className="mr-2 h-5 w-5 text-purple-400" />
              Price Trend for {item.itemName}{item.destination ? ` in ${item.destination}` : ''}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Illustrative trend based on AI forecast. Current: ${item.currentPrice.toLocaleString()}, Target: ${item.targetPrice.toLocaleString()}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {item.priceForecast?.forecast && (
                <Alert variant="default" className="mb-4 p-2.5 text-xs border-purple-500/30 bg-purple-500/10 text-card-foreground">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
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

