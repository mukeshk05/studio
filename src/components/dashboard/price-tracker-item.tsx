
"use client";

import type { PriceTrackerEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaneIcon, HotelIcon, DollarSignIcon, TagIcon, Trash2Icon, RefreshCwIcon, BellIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { trackPrice, PriceTrackerInput, PriceTrackerOutput } from "@/ai/flows/price-tracker";
import { getPriceAdvice, PriceAdvisorInput, PriceAdvisorOutput } from "@/ai/flows/price-advisor-flow"; 
import React from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type PriceTrackerItemProps = {
  item: PriceTrackerEntry;
  onRemoveItem: (itemId: string) => Promise<void>; // Made async
  onUpdateItem: (itemId: string, dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>>) => Promise<void>; // Made async
  isUpdating?: boolean;
  isRemoving?: boolean;
};

const glassEffectClasses = "bg-card/60 dark:bg-card/40 backdrop-blur-lg border-white/20 shadow-xl";

export function PriceTrackerItem({ item, onRemoveItem, onUpdateItem, isUpdating, isRemoving }: PriceTrackerItemProps) {
  const { toast } = useToast();
  const [isRecheckingPriceAI, setIsRecheckingPriceAI] = React.useState(false); // For AI call during recheck
  const [newCurrentPrice, setNewCurrentPrice] = React.useState<string>(item.currentPrice.toString());
  const [isRecheckDialogOpen, setIsRecheckDialogOpen] = React.useState(false);
  const [recheckDialogAiAlert, setRecheckDialogAiAlert] = React.useState<PriceTrackerOutput | null>(null); // Alert for dialog
  const [isAiAdviceLoading, setIsAiAdviceLoading] = React.useState(false);


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
      setRecheckDialogAiAlert(alertResult); // Show AI alert in dialog
      
      const dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>> = {
        currentPrice: currentPriceNum,
        alertStatus: alertResult,
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
      // Keep dialog open to show recheckDialogAiAlert, close manually or on success
      // setIsRecheckDialogOpen(false); // Or close it after a delay / on success
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
      await onUpdateItem(item.id, { aiAdvice: result.advice });
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
  
  const Icon = item.itemType === 'flight' ? PlaneIcon : HotelIcon;
  const isCurrentlyUpdating = isUpdating || isRecheckingPriceAI || isAiAdviceLoading;

  return (
    <Card className={`${glassEffectClasses} flex flex-col border-none`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center text-md text-foreground">
            <Icon className="w-5 h-5 mr-2 text-primary" />
            {item.itemName}
          </CardTitle>
          <Badge variant={item.alertStatus?.shouldAlert ? "destructive" : "outline"} className={`whitespace-nowrap ${item.alertStatus?.shouldAlert ? 'bg-destructive/80 text-destructive-foreground' : 'bg-background/70 text-foreground border-border/50'}`}>
            {item.alertStatus?.shouldAlert ? <><BellIcon className="w-3 h-3 mr-1"/> Alert!</> : "Tracking"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-foreground/70">
          Last checked: {formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 flex-grow text-foreground/90">
        <p className="flex items-center"><TagIcon className="w-4 h-4 mr-2 text-muted-foreground" />Type: <span className="font-medium ml-1">{item.itemType}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Target: <span className="font-medium ml-1">${item.targetPrice.toLocaleString()}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Current: <span className="font-medium ml-1">${item.currentPrice.toLocaleString()}</span></p>
        
        {item.alertStatus && (
             <Alert variant={item.alertStatus.shouldAlert ? "destructive" : "default"} className={`p-2.5 text-xs ${item.alertStatus.shouldAlert ? 'bg-destructive/20 border-destructive/50' : 'bg-primary/10 border-primary/30'} text-foreground`}>
                <BellIcon className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold mb-0.5">{item.alertStatus.shouldAlert ? "Action Recommended!" : "Status"}</AlertTitle>
                <AlertDescription className="text-xs">
                  {item.alertStatus.alertMessage}
                </AlertDescription>
              </Alert>
        )}

        {(isAiAdviceLoading || (isCurrentlyUpdating && !item.aiAdvice)) && (
          <div className="flex items-center justify-center p-3 bg-muted/30 dark:bg-muted/20 rounded-md">
            <Loader2Icon className="w-5 h-5 mr-2 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Getting AI advice...</span>
          </div>
        )}

        {item.aiAdvice && !isAiAdviceLoading && (
          <Alert variant="default" className="p-2.5 text-xs border-accent/30 bg-accent/10 text-foreground transition-opacity duration-300">
            <SparklesIcon className="h-4 w-4 text-accent" />
            <AlertTitle className="text-xs font-semibold text-accent mb-0.5">AI Price Advisor</AlertTitle>
            <AlertDescription className="text-xs">
              {item.aiAdvice}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-3">
        <Button onClick={handleGetAiAdvice} variant="outline" size="sm" className="w-full sm:w-auto flex-1 bg-background/70 hover:bg-accent/20 border-input/70" disabled={isCurrentlyUpdating}>
          {isAiAdviceLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          AI Advice
        </Button>
        <div className="flex w-full sm:w-auto gap-2">
            <Button onClick={() => { setNewCurrentPrice(item.currentPrice.toString()); setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(true); }} variant="outline" size="sm" className="flex-1 bg-background/70 hover:bg-accent/20 border-input/70" disabled={isCurrentlyUpdating}>
              <RefreshCwIcon className="mr-2 h-4 w-4" /> Re-check
            </Button>
            <Button onClick={() => onRemoveItem(item.id)} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2" disabled={isRemoving || isCurrentlyUpdating}>
              {isRemoving ? <Loader2Icon className="animate-spin" /> : <Trash2Icon className="h-4 w-4" />}
            </Button>
        </div>
      </CardFooter>

      <Dialog open={isRecheckDialogOpen} onOpenChange={setIsRecheckDialogOpen}>
        <DialogContent className={`${glassEffectClasses} border-none`}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Re-check Price for {item.itemName}</DialogTitle>
            <DialogDescription className="text-foreground/80">
              Enter the new current price to get an updated AI analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCurrentPrice" className="text-right col-span-1 text-foreground/90">
                New Price
              </Label>
              <Input
                id="newCurrentPrice"
                type="number"
                value={newCurrentPrice}
                onChange={(e) => setNewCurrentPrice(e.target.value)}
                className="col-span-3 bg-background/70 dark:bg-background/50 border-input/70"
                placeholder={item.currentPrice.toString()}
              />
            </div>
             {recheckDialogAiAlert && (
              <Alert className={`mt-2 ${recheckDialogAiAlert.shouldAlert ? 'border-green-500/70 text-green-700 dark:text-green-400' : 'border-blue-500/70 text-blue-700 dark:text-blue-400'} bg-background/80 backdrop-blur-sm`}>
                <BellIcon className={`h-4 w-4 ${recheckDialogAiAlert.shouldAlert ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`} />
                <AlertTitle className="text-foreground">{recheckDialogAiAlert.shouldAlert ? "Price Alert!" : "Price Update"}</AlertTitle>
                <AlertDescription className="text-foreground/80">
                  {recheckDialogAiAlert.alertMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => {setRecheckDialogAiAlert(null); setIsRecheckDialogOpen(false);}} className="bg-background/70 hover:bg-accent/20 border-input/70">Cancel</Button>
            </DialogClose>
            <Button onClick={handleRecheckPriceSubmit} disabled={isRecheckingPriceAI || isUpdating}>
              {isRecheckingPriceAI ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
              Check Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
