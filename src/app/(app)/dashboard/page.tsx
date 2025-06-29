
"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, BellRing, Lightbulb, RefreshCw, Loader2, TrendingUp, Sparkles, Wand2 } from 'lucide-react';
import { getTravelTip, TravelTipOutput } from "@/ai/flows/travel-tip-flow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedTrips, useTrackedItems } from "@/lib/firestoreHooks";
import { cn } from "@/lib/utils";
import type { AITripPlannerInput } from "@/ai/types/trip-planner-types";
import { useRouter } from 'next/navigation';
import { onForegroundMessageListener } from "@/lib/firebaseMessaging";
import { Skeleton } from "@/components/ui/skeleton";

// Skeletons for dynamic components
const DashboardCardSkeleton = () => <Skeleton className="w-full h-72 rounded-lg bg-card/50" />;
const TabsContentSkeleton = () => <Skeleton className="w-full h-[400px] rounded-lg bg-card/50" />;

// Dynamic imports
const SmartBundleGenerator = dynamic(() => import('@/components/dashboard/SmartBundleGenerator').then(mod => mod.SmartBundleGenerator), { loading: () => <DashboardCardSkeleton />, ssr: false });
const NotificationSettings = dynamic(() => import('@/components/dashboard/NotificationSettings').then(mod => mod.NotificationSettings), { loading: () => <Skeleton className="w-full h-48 rounded-lg bg-card/50" />, ssr: false });
const BookingList = dynamic(() => import('@/components/dashboard/booking-list').then(mod => mod.BookingList), { loading: () => <TabsContentSkeleton />, ssr: false });
const SavedIdeasHistory = dynamic(() => import('@/components/dashboard/SavedIdeasHistory').then(mod => mod.SavedIdeasHistory), { loading: () => <TabsContentSkeleton />, ssr: false });
const PriceTrackerForm = dynamic(() => import('@/components/dashboard/price-tracker-form').then(mod => mod.PriceTrackerForm), { loading: () => <DashboardCardSkeleton />, ssr: false });
const PriceTrackerList = dynamic(() => import('@/components/dashboard/price-tracker-list').then(mod => mod.PriceTrackerList), { loading: () => <TabsContentSkeleton />, ssr: false });


export default function DashboardPage() {
  const [travelTip, setTravelTip] = useState<string | null>(null);
  const [isTipLoading, setIsTipLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  const { data: savedTrips, isLoading: isLoadingTrips } = useSavedTrips();
  const { data: trackedItems, isLoading: isLoadingTrackedItems } = useTrackedItems();

  const fetchNewTravelTip = useCallback(async () => {
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
  }, [toast]);

  useEffect(() => {
    const handleLocalStorageUpdate = () => {
      const bundledTripData = localStorage.getItem('tripBundleToPlan');
      if (bundledTripData) {
        try {
          if (router) {
            window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
            router.push('/planner');
          }
        } catch (e) {
          console.error("Error parsing trip bundle/quiz data from localStorage:", e);
        }
      }
    };
    
    const storageHandlerFunction = (event: StorageEvent) => {
        if (event.key === 'tripBundleToPlan') {
            handleLocalStorageUpdate();
        }
    };

    window.addEventListener('localStorageUpdated_tripBundleToPlan', handleLocalStorageUpdate);
    window.addEventListener('storage', storageHandlerFunction);


    return () => {
      window.removeEventListener('localStorageUpdated_tripBundleToPlan', handleLocalStorageUpdate);
      window.removeEventListener('storage', storageHandlerFunction);
    };
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      if (Notification.permission === 'granted' && localStorage.getItem('fcmToken')) {
        onForegroundMessageListener()
          .then((payload) => {
            console.log("Foreground message received in DashboardPage: ", payload);
          })
          .catch((err) =>
            console.error("Failed to listen for foreground messages: ", err)
          );
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchNewTravelTip();
    }
  }, [currentUser, fetchNewTravelTip]);

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "Explorer";
  const numSavedTrips = savedTrips?.length || 0;
  const numTrackedItems = trackedItems?.length || 0;

  const handlePlanTripFromBundle = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className={cn("mb-8 p-6", "glass-card", "animate-fade-in-up")}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {userName}!</h1>
                <p className="text-muted-foreground mt-1">
                    You have {numSavedTrips} saved trip{numSavedTrips !== 1 ? 's' : ''} and {numTrackedItems} item{numTrackedItems !== 1 ? 's' : ''} in your price tracker.
                </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button variant="outline" size="sm" className="glass-interactive" onClick={() => document.getElementById('my-trips-trigger')?.click()}>
                    <ListChecks className="w-4 h-4 mr-2" />
                    View Trips
                </Button>
                 <Button variant="outline" size="sm" className="glass-interactive" onClick={() => document.getElementById('price-tracker-trigger')?.click()}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Price Tracker
                </Button>
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className={cn("lg:col-span-1", "glass-card", "animate-fade-in-up")} style={{animationDelay: '0.1s'}}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-lg text-card-foreground">
                <Lightbulb className="w-6 h-6 mr-2 text-yellow-400" />
                AI Travel Tip
              </CardTitle>
              <Button onClick={fetchNewTravelTip} variant="ghost" size="sm" disabled={isTipLoading} className="text-primary hover:bg-primary/10 hover:text-primary/80 glass-interactive">
                {isTipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">New Tip</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isTipLoading && !travelTip && (
              <div className="flex items-center text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Fetching inspiration...</span>
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

        <div className={cn("lg:col-span-2", "animate-fade-in-up")} style={{animationDelay: '0.2s'}}>
            <SmartBundleGenerator onPlanTripFromBundle={handlePlanTripFromBundle} />
        </div>
      </div>
      
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <NotificationSettings />
      </div>


      <Tabs defaultValue="my-trips" className="w-full">
        <TabsList className={cn(
            "grid w-full grid-cols-2 sm:grid-cols-3 md:w-auto md:inline-flex mb-6 p-1.5 rounded-lg shadow-md",
            "glass-pane border-opacity-50", 
            "animate-fade-in-up"
          )} style={{animationDelay: '0.4s'}}>
          <TabsTrigger value="my-trips" id="my-trips-trigger" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <ListChecks className="w-5 h-5" />
            My Saved Trips
          </TabsTrigger>
           <TabsTrigger value="ai-ideas" id="ai-ideas-trigger" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <Wand2 className="w-5 h-5" />
            AI-Generated Ideas
          </TabsTrigger>
          <TabsTrigger value="price-tracker" id="price-tracker-trigger" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <BellRing className="w-5 h-5" />
            Price Tracker
          </TabsTrigger>
        </TabsList>

        <div className={cn("p-0 sm:p-2 rounded-xl", "glass-card", "animate-fade-in-up")} style={{animationDelay: '0.45s'}}>
          <TabsContent value="my-trips" className="mt-0">
            <BookingList />
          </TabsContent>
          <TabsContent value="ai-ideas" className="mt-0">
            <SavedIdeasHistory />
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
