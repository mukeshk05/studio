"use client";

import type { PriceTrackerEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaneIcon, HotelIcon, DollarSignIcon, TagIcon, Trash2Icon, RefreshCwIcon, BellIcon } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { trackPrice, PriceTrackerInput, PriceTrackerOutput } from "@/ai/flows/price-tracker";
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [recheckResult, setRecheckResult] = React.useState<PriceTrackerOutput | null>(null);


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
      onUpdateItem(updatedItem);

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
      // Keep dialog open to show result, or close if preferred: setIsDialogOpen(false);
    }
  };
  
  const Icon = item.itemType === 'flight' ? PlaneIcon : HotelIcon;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center text-md">
            <Icon className="w-5 h-5 mr-2 text-primary" />
            {item.itemName}
          </CardTitle>
          <Badge variant={item.alertStatus?.shouldAlert ? "destructive" : "outline"}>
            {item.alertStatus?.shouldAlert ? <><BellIcon className="w-3 h-3 mr-1"/> Alert!</> : "Tracking"}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Last checked: {formatDistanceToNow(new Date(item.lastChecked), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <p className="flex items-center"><TagIcon className="w-4 h-4 mr-2 text-muted-foreground" />Type: <span className="font-medium ml-1">{item.itemType}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Target: <span className="font-medium ml-1">${item.targetPrice.toLocaleString()}</span></p>
        <p className="flex items-center"><DollarSignIcon className="w-4 h-4 mr-2 text-muted-foreground" />Current: <span className="font-medium ml-1">${item.currentPrice.toLocaleString()}</span></p>
        {item.alertStatus && (
             <Alert variant={item.alertStatus.shouldAlert ? "destructive" : "default"} className="mt-2 p-2 text-xs">
                <BellIcon className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">{item.alertStatus.shouldAlert ? "Action Recommended!" : "Status"}</AlertTitle>
                <AlertDescription className="text-xs">
                  {item.alertStatus.alertMessage}
                </AlertDescription>
              </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm" className="flex-1">
          <RefreshCwIcon className="mr-2 h-4 w-4" /> Re-check
        </Button>
        <Button onClick={() => onRemoveItem(item.id)} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </CardFooter>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
