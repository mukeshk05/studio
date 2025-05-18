
"use client";

import { PriceTrackerItem } from "./price-tracker-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BellRingIcon, Loader2Icon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTrackedItems, useRemoveTrackedItem, useUpdateTrackedItem } from "@/lib/firestoreHooks";
import type { PriceTrackerEntry } from "@/lib/types";

export function PriceTrackerList() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const { data: trackedItems, isLoading, error } = useTrackedItems();
  const removeTrackedItemMutation = useRemoveTrackedItem();
  const updateTrackedItemMutation = useUpdateTrackedItem();

  const handleRemoveItem = async (itemId: string) => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
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

  const handleUpdateItem = async (itemId: string, dataToUpdate: Partial<Omit<PriceTrackerEntry, 'id'>>) => {
     if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    try {
      await updateTrackedItemMutation.mutateAsync({ itemId, dataToUpdate });
      // Toast for update success can be handled in PriceTrackerItem or here if needed
    } catch (err) {
      console.error("Error updating item:", err);
      toast({ title: "Error Updating Item", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <Loader2Icon className="w-12 h-12 animate-spin mb-4" />
        <h3 className="text-xl font-semibold">Loading Tracked Items...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-destructive">
        <BellRingIcon className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Tracked Items</h3>
        <p>{error.message}</p>
      </div>
    );
  }
  
  if (!currentUser) {
     return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
        <BellRingIcon className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Please Log In</h3>
        <p>Log in to see your tracked items.</p>
      </div>
    );
  }

  if (!trackedItems || trackedItems.length === 0) {
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
        {/* Sort by lastChecked or createdAt if available. For now, default order. */}
        {/* Firestore typically returns by ID if not specified, or you can sort in the query */}
        {trackedItems.sort((a,b) => new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime()).map((item) => (
          <PriceTrackerItem 
            key={item.id} 
            item={item} 
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem} // Pass the new update handler
            // Pass mutation states for individual item loading indicators
            isUpdating={updateTrackedItemMutation.isPending && updateTrackedItemMutation.variables?.itemId === item.id}
            isRemoving={removeTrackedItemMutation.isPending && removeTrackedItemMutation.variables === item.id}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
