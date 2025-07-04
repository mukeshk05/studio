"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose as SheetDialogClose, 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ItineraryCard } from "../trip-planner/itinerary-card";
import type { Itinerary } from "@/lib/types";
import type { AiArPreviewOutput } from "@/ai/types/ai-ar-preview-types";
import { getAiArPreview, getLocalInsiderTips } from "@/app/actions";
import type { LocalInsiderTipsOutput } from "@/ai/flows/local-insider-tips-flow";
import { LocalInsiderTipsDisplay } from "@/components/common/LocalInsiderTipsDisplay";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MapPin, Send, Bookmark, Loader2, ScanEye, ImageOff, Sparkles, Info, Tag, Clock, Compass as CompassIcon, Tabs, TabsContent, TabsList, TabsTrigger } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel, 
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { TripTimelineDialog } from "./TripTimelineDialog";

type ItineraryDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
  onSaveTrip: (itineraryData: Omit<Itinerary, 'id'>) => void;
  isTripSaved: boolean;
  isSaving?: boolean;
  isAuthLoading?: boolean;
  onInitiateBooking: () => void;
};

const glassPaneClasses = "glass-pane"; 
const glassCardClasses = "glass-card"; 
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";


export function ItineraryDetailSheet({
  isOpen,
  onClose,
  itinerary,
  onSaveTrip,
  isTripSaved,
  isSaving,
  isAuthLoading,
  onInitiateBooking,
}: ItineraryDetailSheetProps) {
  const [isArVrDialogOpen, setIsArVrDialogOpen] = useState(false);
  const [isLoadingArPreview, setIsLoadingArPreview] = useState(false);
  const [arPreviewData, setArPreviewData] = useState<AiArPreviewOutput | null>(null);
  const [localTips, setLocalTips] = useState<LocalInsiderTipsOutput | null>(null);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataToSave } = itinerary;
    onSaveTrip(dataToSave);
  };

  const handleBook = () => {
    onInitiateBooking();
  };

  const itineraryForCard: Itinerary = 'id' in itinerary && itinerary.id
    ? itinerary
    : { ...itinerary, id: `temp-${crypto.randomUUID()}`};

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  let mapEmbedUrl = "";
  if (mapsApiKey) {
    const mapQuery = itinerary.destinationLatitude && itinerary.destinationLongitude
      ? `${itinerary.destinationLatitude},${itinerary.destinationLongitude}`
      : encodeURIComponent(`${itinerary.destination}`);
    mapEmbedUrl = `https://www.google.com/maps/embed/v1/search?key=${mapsApiKey}&q=${mapQuery}&zoom=10`;
  }


  const handleFetchArPreview = async () => {
    if (!itinerary.destination) return;
    setIsLoadingArPreview(true);
    setArPreviewData(null);
    try {
      const result = await getAiArPreview({ landmarkName: itinerary.destination });
      setArPreviewData(result);
      if (!result.sceneDescription) {
        toast({
          title: "AR Insights Not Detailed",
          description: "AI provided a visual, but detailed scene insights weren't available this time.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error fetching AR preview:", error);
      toast({
        title: "AI Error",
        description: "Could not fetch AR preview insights. Please try again.",
        variant: "destructive",
      });
      setArPreviewData({
        sceneDescription: "Could not load AR insights at this moment.",
        moodTags: [],
        activityTags: [],
        generatedImageUri: `https://placehold.co/800x450.png?text=Error+Loading+Preview`,
        generatedImagePrompt: `Error state for ${itinerary.destination}`
      });
    } finally {
      setIsLoadingArPreview(false);
    }
  };
  
  useEffect(() => {
    if (isOpen) {
        setLocalTips(null); // Reset tips when sheet opens
        setIsLoadingTips(true);
        getLocalInsiderTips({ destination: itinerary.destination })
            .then(setLocalTips)
            .catch(err => {
                console.error("Failed to fetch local tips for itinerary sheet:", err);
                toast({ title: "Tips Error", description: "Could not load local insights.", variant: "destructive" });
            })
            .finally(() => setIsLoadingTips(false));

        if (isArVrDialogOpen && !arPreviewData && !isLoadingArPreview) {
            handleFetchArPreview();
        }
    }
  }, [isArVrDialogOpen, isOpen, itinerary.destination, toast, isLoadingArPreview, arPreviewData]); 

  const arImageHint = arPreviewData?.generatedImageUri?.startsWith('https://placehold.co') 
    ? (arPreviewData?.generatedImagePrompt || itinerary.destination) 
    : undefined;

  const prominentButtonBaseClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className={cn("w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 flex flex-col", glassPaneClasses)}>
          <SheetHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <div>
                <SheetTitle className="text-foreground">{itinerary.destination}</SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Detailed plan for your trip from {itinerary.travelDates}. Estimated cost: ${itinerary.estimatedCost.toLocaleString()}.
                </SheetDescription>
              </div>
              <SheetDialogClose asChild>
                <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                  <X className="h-5 w-5" />
                </Button>
              </SheetDialogClose>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <div className="p-4 sm:p-6 space-y-6">
               <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
                  <TabsTrigger value="itinerary" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Full Plan</TabsTrigger>
                  <TabsTrigger value="map" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Area Map</TabsTrigger>
                  <TabsTrigger value="local-insights" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground text-xs sm:text-sm">Local Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="itinerary">
                  <ItineraryCard
                    itinerary={itineraryForCard}
                    onSaveTrip={handleSave}
                    isSaved={isTripSaved}
                    isSaving={isSaving}
                    isDetailedView={true}
                    isAuthLoading={isAuthLoading}
                  />
                </TabsContent>

                <TabsContent value="map">
                    <div className={cn("p-4", glassCardClasses)}>
                        <h3 className="text-lg font-semibold mb-3 flex items-center text-card-foreground">
                        <MapPin className="w-5 h-5 mr-2 text-primary" />
                        Explore {itinerary.destination} Area
                        </h3>
                        {mapsApiKey ? (
                        <div className="aspect-video w-full rounded-md overflow-hidden border border-border/50">
                            <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={mapEmbedUrl}
                            title={`Map of hotels in ${itinerary.destination}`}
                            ></iframe>
                        </div>
                        ) : (
                        <div className="text-center py-8 text-muted-foreground bg-muted/30 p-4 rounded-md">
                            <p>Google Maps API Key is missing.</p>
                            <p className="text-xs">Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables to enable map features.</p>
                        </div>
                        )}
                    </div>
                </TabsContent>
                
                <TabsContent value="local-insights">
                    {isLoadingTips && (
                        <div className="flex flex-col items-center justify-center text-center py-10 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 text-accent" />
                            <p>Fetching Local Insider Tips...</p>
                        </div>
                    )}
                    {!isLoadingTips && localTips && (
                        <LocalInsiderTipsDisplay tipsData={localTips} destinationName={itinerary.destination} />
                    )}
                    {!isLoadingTips && !localTips && (
                        <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
                            <CompassIcon className="w-10 h-10 mx-auto mb-2 opacity-70" />
                            Could not load local insider tips for {itinerary.destination} at this moment.
                        </Card>
                    )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
           <div className={cn("p-4 sm:p-6 border-t border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3", glassPaneClasses)}>
              <Button
                onClick={handleSave}
                disabled={isTripSaved || isSaving || isAuthLoading}
                size="lg"
                className={cn(
                  "w-full",
                  isTripSaved ? "glass-interactive text-muted-foreground" : prominentButtonBaseClasses
                )}
                variant={isTripSaved ? "secondary" : "default"} 
              >
                {isSaving || isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bookmark className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving..." : isAuthLoading ? "Authenticating..." : isTripSaved ? "Saved" : "Save Trip"}
              </Button>
              <Button
                onClick={handleBook}
                size="lg"
                className={cn("w-full", prominentButtonBaseClasses)}
                variant="default" 
              >
                <Send className="mr-2 h-4 w-4" />
                Start Booking
              </Button>
              <Button
                onClick={() => {
                  setArPreviewData(null); 
                  setIsArVrDialogOpen(true);
                }}
                variant="default" 
                size="lg"
                className={cn("w-full", prominentButtonBaseClasses)}
              >
                <ScanEye className="mr-2 h-4 w-4" />
                AR/VR Preview
              </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isArVrDialogOpen} onOpenChange={setIsArVrDialogOpen}>
          <AlertDialogContent className={cn(glassCardClasses, "sm:max-w-lg md:max-w-xl p-0")}>
              <AlertDialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <AlertDialogTitle className="text-xl font-semibold text-foreground flex items-center">
                        <ScanEye className="w-5 h-5 mr-2 text-purple-400"/>Simulated AR Preview
                    </AlertDialogTitle>
                    <AlertDialogClose asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                            <X className="h-5 w-5" />
                        </Button>
                    </AlertDialogClose>
                  </div>
                  <AlertDialogDescription className="text-sm text-muted-foreground">
                      AI-generated insights for {itinerary.destination} as if viewed through AR.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {isLoadingArPreview && (
                      <div className="text-center py-10 text-muted-foreground">
                          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3 text-purple-400" />
                          <p>Aura Lens is analyzing the scene...</p>
                      </div>
                  )}
                  {!isLoadingArPreview && arPreviewData && (
                      <>
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/30 shadow-lg bg-muted/30">
                              {arPreviewData.generatedImageUri ? (
                                  <Image
                                      src={arPreviewData.generatedImageUri}
                                      alt={`AI generated AR preview for ${itinerary.destination}`}
                                      fill
                                      className="object-cover"
                                      data-ai-hint={arImageHint}
                                      sizes="(max-width: 640px) 90vw, 500px"
                                  />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-16 h-16 text-muted-foreground" />
                                  </div>
                              )}
                          </div>
                          <div className={cn(innerGlassEffectClasses, "p-3 rounded-md")}>
                            <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Info className="w-4 h-4 mr-1.5 text-primary" />Scene Description (Now):</h4>
                            <p className="text-sm text-muted-foreground pl-6">{arPreviewData.sceneDescription}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className={cn(innerGlassEffectClasses, "p-3 rounded-md")}>
                                <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><Tag className="w-4 h-4 mr-1.5 text-primary" />Current Mood:</h4>
                                <div className="flex flex-wrap gap-1.5 pl-1">
                                    {arPreviewData.moodTags.map((tag, idx) => <Badge key={`mood-${idx}`} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{tag}</Badge>)}
                                </div>
                            </div>
                            <div className={cn(innerGlassEffectClasses, "p-3 rounded-md")}>
                                <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><Tag className="w-4 h-4 mr-1.5 text-primary" />Suggested Activities (Now):</h4>
                                <div className="flex flex-wrap gap-1.5 pl-1">
                                    {arPreviewData.activityTags.map((tag, idx) => <Badge key={`activity-${idx}`} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{tag}</Badge>)}
                                </div>
                            </div>
                          </div>

                          {arPreviewData.optimalPhotoTime && (
                            <div className={cn(innerGlassEffectClasses, "p-3 rounded-md")}>
                              <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Clock className="w-4 h-4 mr-1.5 text-primary" />Optimal Photo Time:</h4>
                              <p className="text-sm text-muted-foreground pl-6">{arPreviewData.optimalPhotoTime}</p>
                            </div>
                          )}
                           {arPreviewData.generatedImagePrompt && (
                              <p className="text-xs italic text-muted-foreground/70 text-center">(AI used image prompt: "{arPreviewData.generatedImagePrompt}")</p>
                            )}
                      </>
                  )}
                  {!isLoadingArPreview && !arPreviewData && (
                    <p className="text-center py-10 text-muted-foreground">Click the button in the main view to fetch AR insights.</p>
                  )}
              </div>
              <AlertDialogFooter className={cn("p-4 sm:p-6 border-t border-border/30", "glass-pane")}>
                  <AlertDialogAction
                    onClick={() => setIsArVrDialogOpen(false)}
                    size="lg"
                    className={cn(prominentButtonBaseClasses, "w-full")}
                  >Awesome!</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      {itinerary && (
        <TripTimelineDialog 
            isOpen={isTimelineDialogOpen}
            onClose={() => setIsTimelineDialogOpen(false)}
            trip={itinerary}
        />
      )}
    </>
  );
}
