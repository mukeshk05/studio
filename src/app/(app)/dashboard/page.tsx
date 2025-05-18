"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingList } from "@/components/dashboard/booking-list";
import { PriceTrackerForm } from "@/components/dashboard/price-tracker-form";
import { PriceTrackerList } from "@/components/dashboard/price-tracker-list";
import useLocalStorage from "@/hooks/use-local-storage";
import type { PriceTrackerEntry } from "@/lib/types";
import { ListChecksIcon, BellRingIcon } from "lucide-react";

export default function DashboardPage() {
  const [trackedItems, setTrackedItems] = useLocalStorage<PriceTrackerEntry[]>("trackedItems", []);

  const handleTrackerAdded = (newEntry: PriceTrackerEntry) => {
    setTrackedItems([...trackedItems, newEntry]);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Your Dashboard</h1>
      <Tabs defaultValue="my-trips" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex mb-6">
          <TabsTrigger value="my-trips" className="flex items-center gap-2">
            <ListChecksIcon className="w-5 h-5" />
            My Saved Trips
          </TabsTrigger>
          <TabsTrigger value="price-tracker" className="flex items-center gap-2">
            <BellRingIcon className="w-5 h-5" />
            Price Tracker
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-trips">
          <BookingList />
        </TabsContent>
        <TabsContent value="price-tracker">
          <PriceTrackerForm onTrackerAdded={handleTrackerAdded} />
          <PriceTrackerList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
