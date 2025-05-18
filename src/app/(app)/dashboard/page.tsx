
"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookingList } from "@/components/dashboard/booking-list";
import { PriceTrackerForm } from "@/components/dashboard/price-tracker-form";
import { PriceTrackerList } from "@/components/dashboard/price-tracker-list";
import { ListChecksIcon, BellRingIcon, LightbulbIcon, RefreshCwIcon, Loader2Icon } from "lucide-react";
import { getTravelTip, TravelTipOutput } from "@/ai/flows/travel-tip-flow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";


export default function DashboardPage() {
  const [travelTip, setTravelTip] = useState<string | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchNewTravelTip = async () => {
    setIsTipLoading(true);
    setTravelTip(null); 
    try {
      const result: TravelTipOutput = await getTravelTip();
      setTravelTip(result.tip);
    } catch (error) {
      console.error("Error fetching travel tip:", error);
      setTravelTip("Could not fetch a new tip at this moment. Please try again later.");
      toast({
        title: "Error Fetching Tip",
        description: "Failed to get a new travel tip.",
        variant: "destructive",
      });
    } finally {
      setIsTipLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) { 
      fetchNewTravelTip();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); 

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-6 text-foreground">Your Dashboard</h1>

      <Card className={cn("mb-8", "glass-card")}> {/* Applied glass-card */}
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center text-lg text-card-foreground">
              <LightbulbIcon className="w-6 h-6 mr-2 text-yellow-400" />
              AI Travel Tip of the Day
            </CardTitle>
            <Button onClick={fetchNewTravelTip} variant="ghost" size="sm" disabled={isTipLoading} className="text-primary hover:bg-primary/10 hover:text-primary/80">
              {isTipLoading ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <RefreshCwIcon className="w-4 h-4" />}
               <span className="ml-2 hidden sm:inline">New Tip</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isTipLoading && !travelTip && (
            <div className="flex items-center text-muted-foreground">
              <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
              <span>Fetching your daily inspiration...</span>
            </div>
          )}
          {travelTip && (
            <p className="text-sm text-card-foreground/90 transition-opacity duration-500">{travelTip}</p>
          )}
          {!isTipLoading && !travelTip && (
             <p className="text-sm text-muted-foreground">Loading travel tip...</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="my-trips" className="w-full">
        <TabsList className={cn(
            "grid w-full grid-cols-1 sm:grid-cols-2 md:w-auto md:inline-flex mb-6 p-1.5 rounded-lg", 
            "bg-muted/30 dark:bg-card/30 backdrop-blur-sm border border-white/10 dark:border-black/20 shadow-md" // Glassy TabsList
          )}>
          <TabsTrigger value="my-trips" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <ListChecksIcon className="w-5 h-5" />
            My Saved Trips
          </TabsTrigger>
          <TabsTrigger value="price-tracker" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <BellRingIcon className="w-5 h-5" />
            Price Tracker
          </TabsTrigger>
        </TabsList>
        
        <div className={cn("p-0 sm:p-2 rounded-xl", "glass-card")}> {/* Applied glass-card to TabsContent wrapper */}
          <TabsContent value="my-trips" className="mt-0">
            <BookingList />
          </TabsContent>
          <TabsContent value="price-tracker" className="mt-0">
            <PriceTrackerForm /> 
            <PriceTrackerList />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
