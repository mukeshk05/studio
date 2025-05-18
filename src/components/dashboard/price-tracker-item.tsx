
"use client";

import type { PriceTrackerEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaneIcon, HotelIcon, DollarSignIcon, TagIcon, Trash2Icon, RefreshCwIcon, BellIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { trackPrice, PriceTrackerInput, PriceTrackerOutput } from "@/ai/flows/price-tracker";
import { getPriceAdvice, PriceAdvisorInput, PriceAdvisorOutput } from "@/ai/flows/price-advisor-flow"; // New import
import React from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type PriceTrackerItemProps = {
  item: PriceTrackerEntry;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (item: PriceTrackerEntry) => void;
};

export function PriceTrackerItem({ item, onRemoveItem, onUpdateItem }: PriceTrackerItemProps) {
  const { toast } = useToast();
  const [isRechecking, setIsRechecking] = React.useState(false);
  const [newCurrentPrice, setNewCurrentPrice] = React.useState<string>(item.currentPrice.toString());
  const [isRecheckDialogOpen, setIsRecheckDialogOpen] = React.useState(false);
  const [recheckResult, setRecheckResult] = React.useState<PriceTrackerOutput | null>(null);
  const [isAiAdviceLoading, setIsAiAdviceLoading] = React.useState(false);


  const handleRecheckPrice = async () => {
    const currentPriceNum = parseFloat(newCurrentPrice);
    if (isNaN(currentPriceNum) || currentPriceNum <= 0) {
      toast({ title: "Invalid Price", description: "Please enter a valid current price.", variant: "destructive" });
      return;
    }

    setIsRechecking(true);
    setRecheckResult(null);
    try {
      const input: PriceTrackerInput = {
        itemType: item.itemType,
        itemName: item.itemName,
        targetPrice: item.targetPrice,
        currentPrice: currentPriceNum,
      };
      const result = await trackPrice(input);
      setRecheckResult(result);
      
      const updatedItem: PriceTrackerEntry = {
        ...item,
        currentPrice: currentPriceNum,
        lastChecked: new Date().toISOString(),
        alertStatus: result,
      };
      onUpdateItem(updatedItem); // This will also save to localStorage via useLocalStorage in parent

      toast({
        title: "Price Re-checked",
        description: `Latest price for ${item.itemName} updated.`,
      });
      if (result.shouldAlert) {
        toast({
          title: "Price Alert!",
          description: result.alertMessage,
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Error re-checking price:", error);
      toast({ title: "Error", description: "Could not re-check price.", variant: "destructive" });
    } finally {
      setIsRechecking(false);
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
      const updatedItem = { ...item, aiAdvice: result.advice, lastChecked: new Date().toISOString() };
      onUpdateItem(updatedItem);
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

  return (
    <Card className="shadow-sm flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center text-md">
            <Icon className="w-5 h-5 mr-2 text-primary" />
            {item.itemName}
          </CardTitle>
          <Badge variant={item.alertStatus?.shouldAlert ? "destructive" : "outline"} className="whitespace-nowrap">
            {item.alertStatus?.shouldAlert ? <><BellIcon className="w-3 h-3 mr-1"/> Alert!</> : "Tracking"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Last checked: {formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-2 flex-grow">
        <p className="flex items-center"><TagIcon className="w-4 h-4 mr-2 text-muted-foreground" />Type: <span className="font-medium ml-1">{item.itemType}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Target: <span className="font-medium ml-1">${item.targetPrice.toLocaleString()}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Current: <span className="font-medium ml-1">${item.currentPrice.toLocaleString()}</span></p>
        
        {item.alertStatus && (
             <Alert variant={item.alertStatus.shouldAlert ? "destructive" : "default"} className="p-2.5 text-xs">
                <BellIcon className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold mb-0.5">{item.alertStatus.shouldAlert ? "Action Recommended!" : "Status"}</AlertTitle>
                <AlertDescription className="text-xs">
                  {item.alertStatus.alertMessage}
                </AlertDescription>
              </Alert>
        )}

        {isAiAdviceLoading && (
          <div className="flex items-center justify-center p-3 bg-muted/50 rounded-md">
            <Loader2Icon className="w-5 h-5 mr-2 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Getting AI advice...</span>
          </div>
        )}

        {item.aiAdvice && !isAiAdviceLoading && (
          <Alert variant="default" className="p-2.5 text-xs border-accent/50 transition-opacity duration-300">
            <SparklesIcon className="h-4 w-4 text-accent" />
            <AlertTitle className="text-xs font-semibold text-accent mb-0.5">AI Price Advisor</AlertTitle>
            <AlertDescription className="text-xs text-foreground">
              {item.aiAdvice}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-3">
        <Button onClick={handleGetAiAdvice} variant="outline" size="sm" className="w-full sm:w-auto flex-1" disabled={isAiAdviceLoading}>
          {isAiAdviceLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          AI Advice
        </Button>
        <div className="flex w-full sm:w-auto gap-2">
            <Button onClick={() => setIsRecheckDialogOpen(true)} variant="outline" size="sm" className="flex-1">
            <RefreshCwIcon className="mr-2 h-4 w-4" /> Re-check
            </Button>
            <Button onClick={() => onRemoveItem(item.id)} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2">
            <Trash2Icon className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>

      <Dialog open={isRecheckDialogOpen} onOpenChange={setIsRecheckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-check Price for {item.itemName}</DialogTitle>
            <DialogDescription>
              Enter the new current price to get an updated AI analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newCurrentPrice" className="text-right col-span-1">
                New Price
              </Label>
              <Input
                id="newCurrentPrice"
                type="number"
                value={newCurrentPrice}
                onChange={(e) => setNewCurrentPrice(e.target.value)}
                className="col-span-3"
                placeholder={item.currentPrice.toString()}
              />
            </div>
             {recheckResult && (
              <Alert className={`mt-2 ${recheckResult.shouldAlert ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}`}>
                <BellIcon className={`h-4 w-4 ${recheckResult.shouldAlert ? 'text-green-700' : 'text-blue-700'}`} />
                <AlertTitle>{recheckResult.shouldAlert ? "Price Alert!" : "Price Update"}</AlertTitle>
                <AlertDescription>
                  {recheckResult.alertMessage}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setRecheckResult(null)}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleRecheckPrice} disabled={isRechecking}>
              {isRechecking ? <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
              Check Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
