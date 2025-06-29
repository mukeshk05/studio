
"use client";

import React from "react"; // Added React import
import { PriceTrackerItem } from "./price-tracker-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRing, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTrackedItems, useRemoveTrackedItem, useUpdateTrackedItem } from "@/lib/firestoreHooks";
import type { PriceTrackerEntry } from "@/lib/types";

type PriceTrackerListProps = {
  filterByType?: 'flight' | 'hotel';
};

export function PriceTrackerList({ filterByType }: PriceTrackerListProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const { data: trackedItems, isLoading, error } = useTrackedItems();
  const removeTrackedItemMutation = useRemoveTrackedItem();
  const updateTrackedItemMutation = useUpdateTrackedItem();

  const handleRemoveItem = async (itemId: string) => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to remove items.", variant: "destructive" });
      return;
    }
    try {
      await removeTrackedItemMutation.mutateAsync(itemId);
      toast({
        title: "Item Removed",
        description: "The item has been removed from your price tracker.",
      });
    } catch (err) {
      console.error("Error removing item:", err);
      toast({ title: "Error Removing Item", variant: "destructive" });
    }
  };

  const handleUpdateItem = async (itemId: string, dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id' | 'createdAt'>>) => {
     if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to update items.", variant: "destructive" });
      return;
    }
    try {
      await updateTrackedItemMutation.mutateAsync({ itemId, dataToUpdate });
    } catch (err) {
      console.error("Error updating item:", err);
      toast({ title: "Error Updating Item", variant: "destructive" });
    }
  };

  const filteredItems = React.useMemo(() => {
    if (!trackedItems) return [];
    if (filterByType) {
      return trackedItems.filter(item => item.itemType === filterByType);
    }
    return trackedItems;
  }, [trackedItems, filterByType]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <h3 className="text-xl font-semibold">Loading Tracked Items...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-destructive">
        <BellRing className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Tracked Items</h3>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!currentUser) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <BellRing className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Please Log In</h3>
        <p>Log in to see your tracked items.</p>
      </div>
    );
  }

  if (!filteredItems || filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <BellRing className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">No {filterByType ? `${filterByType}s` : 'Items'} Being Tracked</h3>
        <p>Add {filterByType ? `${filterByType}s` : 'items'} to the tracker to monitor their prices.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-30rem)]">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-1">
        {filteredItems.sort((a,b) => new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime()).map((item) => (
          <PriceTrackerItem 
            key={item.id} 
            item={item} 
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
            isUpdating={updateTrackedItemMutation.isPending && updateTrackedItemMutation.variables?.itemId === item.id}
            isRemoving={removeTrackedItemMutation.isPending && removeTrackedItemMutation.variables === item.id}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
