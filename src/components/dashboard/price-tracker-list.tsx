"use client";

import useLocalStorage from "@/hooks/use-local-storage";
import type { PriceTrackerEntry } from "@/lib/types";
import { PriceTrackerItem } from "./price-tracker-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRingIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PriceTrackerList() {
  const [trackedItems, setTrackedItems] = useLocalStorage<PriceTrackerEntry[]>("trackedItems", []);
  const { toast } = useToast();

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = trackedItems.filter(item => item.id !== itemId);
    setTrackedItems(updatedItems);
    toast({
      title: "Item Removed",
      description: "The item has been removed from your price tracker.",
    });
  };

  const handleUpdateItem = (updatedItem: PriceTrackerEntry) => {
    setTrackedItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  };


  if (trackedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <BellRingIcon className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">No Items Being Tracked</h3>
        <p>Add flights or hotels to the tracker to monitor their prices.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-30rem)]"> {/* Adjust height as needed */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-1">
        {trackedItems.sort((a,b) => new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime()).map((item) => (
          <PriceTrackerItem 
            key={item.id} 
            item={item} 
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
