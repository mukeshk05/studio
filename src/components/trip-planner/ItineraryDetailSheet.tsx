
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose as SheetDialogClose, // Renamed to avoid conflict if Sheet also had a Close
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ItineraryCard } from "./itinerary-card";
import type { Itinerary } from "@/lib/types";
import type { AiArPreviewOutput } from "@/ai/types/ai-ar-preview-types";
import { getAiArPreview } from "@/ai/flows/ai-ar-preview-flow";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MapPin, Send, Bookmark, Loader2, ScanEye, ImageOff, Sparkles, Info, Tag, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  // AlertDialogClose removed from here
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel, // Added AlertDialogCancel if needed for other parts, or can be removed if not used
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

type ItineraryDetailSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
  onSaveTrip: (itineraryData: Omit<Itinerary, 'id'>) => void;
  isTripSaved: boolean;
  isSaving?: boolean;
  onInitiateBooking: (itinerary: Itinerary) => void;
};

const glassPaneClasses = "glass-pane"; 
const glassCardClasses = "glass-card"; 
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";


export function ItineraryDetailSheet({
  isOpen,
  onClose,
  itinerary,
  onSaveTrip,
  isTripSaved,
  isSaving,
  onInitiateBooking,
}: ItineraryDetailSheetProps) {
  const [isArVrDialogOpen, setIsArVrDialogOpen] = useState(false);
  const [isLoadingArPreview, setIsLoadingArPreview] = useState(false);
  const [arPreviewData, setArPreviewData] = useState<AiArPreviewOutput | null>(null);
  const { toast } = useToast();

  const handleSave = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...dataToSave } = itinerary;
    onSaveTrip(dataToSave);
  };

  const handleBook = () => {
    onInitiateBooking(itinerary);
  };

  const itineraryForCard: Itinerary = 'id' in itinerary && itinerary.id
    ? itinerary
    : { ...itinerary, id: `temp-${crypto.randomUUID()}`};

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/search?key=${mapsApiKey}&q=hotels+in+${encodeURIComponent(itinerary.destination)}`
    : "";

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
    if (isOpen && isArVrDialogOpen && !arPreviewData && !isLoadingArPreview) {
      handleFetchArPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArVrDialogOpen, isOpen, itinerary.destination]);

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
              <ItineraryCard
                itinerary={itineraryForCard}
                onSaveTrip={handleSave}
                isSaved={isTripSaved}
                isSaving={isSaving}
                isDetailedView={true}
              />

              <div className={cn("mt-6 p-4", glassCardClasses)}>
                <h3 className="text-lg font-semibold mb-3 flex items-center text-card-foreground">
                  <MapPin className="w-5 h-5 mr-2 text-primary" />
                  Location & Hotels Map
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
            </div>
          </ScrollArea>
           <div className={cn("p-4 sm:p-6 border-t border-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3", glassPaneClasses)}>
              <Button
                onClick={handleSave}
                disabled={isTripSaved || isSaving}
                size="lg"
                className={cn(
                  "w-full",
                  isTripSaved ? "glass-interactive text-muted-foreground" : prominentButtonBaseClasses
                )}
                variant={isTripSaved ? "secondary" : "default"} 
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bookmark className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving..." : isTripSaved ? "Saved" : "Save Trip"}
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
                    {/* Use a standard Button with onClick to close the AlertDialog */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0"
                      onClick={() => setIsArVrDialogOpen(false)}
                    >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </Button>
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
    </>
  );
}
