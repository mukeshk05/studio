
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Itinerary } from '@/lib/types';
import { VisualTimelineDisplay } from './VisualTimelineDisplay';
import { generateTripSummary, TripSummaryInput } from '@/ai/flows/trip-summary-flow';
import { useUpdateSavedTripSummary } from '@/lib/firestoreHooks';
import { Loader2, Sparkles, Info, X, CalendarRange, Route, MessageSquareText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type TripTimelineDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  trip: Itinerary | null;
};

const glassEffectClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";

export function TripTimelineDialog({ isOpen, onClose, trip }: TripTimelineDialogProps) {
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [currentSummaryText, setCurrentSummaryText] = useState<string | null>(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null);
  
  const updateSummaryMutation = useUpdateSavedTripSummary();
  const { toast } = useToast();

  const formatDailyPlanForAISummary = (dailyPlan: Itinerary['dailyPlan']): string => {
    if (!dailyPlan || dailyPlan.length === 0) return "A general trip to explore the destination.";
    return dailyPlan.map(day => `${day.day}: ${day.activities.substring(0, 100)}...`).join('; ');
  };

  useEffect(() => {
    const fetchOrSetSummary = async () => {
      if (trip && isOpen) {
        if (trip.aiTripSummary?.text) {
          // Check if summary is older than, say, 7 days, or if trip data significantly changed (more complex check needed for latter)
          const generatedDate = new Date(trip.aiTripSummary.generatedAt);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          if (generatedDate > sevenDaysAgo) {
            setCurrentSummaryText(trip.aiTripSummary.text);
            setSummaryGeneratedAt(trip.aiTripSummary.generatedAt);
            return;
          }
        }
        
        // If no summary, or it's old, generate a new one
        setIsLoadingSummary(true);
        setCurrentSummaryText(null);
        setSummaryGeneratedAt(null);
        try {
          const summaryInput: TripSummaryInput = {
            destination: trip.destination,
            travelDates: trip.travelDates,
            budget: trip.estimatedCost,
            dailyActivitiesText: formatDailyPlanForAISummary(trip.dailyPlan),
          };
          const result = await generateTripSummary(summaryInput);
          const newSummary = {
            text: result.summary,
            generatedAt: new Date().toISOString(),
          };
          setCurrentSummaryText(newSummary.text);
          setSummaryGeneratedAt(newSummary.generatedAt);
          
          await updateSummaryMutation.mutateAsync({ tripId: trip.id, summary: newSummary });
          toast({ title: "AI Summary Generated!", description: "A fresh summary for your trip." });

        } catch (error) {
          console.error("Error generating trip summary:", error);
          toast({ title: "AI Error", description: "Could not generate trip summary.", variant: "destructive" });
          setCurrentSummaryText("Failed to generate summary.");
        } finally {
          setIsLoadingSummary(false);
        }
      }
    };

    fetchOrSetSummary();
  }, [trip, isOpen, updateSummaryMutation, toast]);

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassEffectClasses, "sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center">
                <Route className="w-6 h-6 mr-2 text-primary" />
                Trip Timeline & AI Summary
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {trip.destination} ({trip.travelDates})
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-grow p-4 sm:p-6">
          <div className="space-y-6">
            {/* AI Summary Section */}
            <Card className={cn(innerGlassEffectClasses, "border-accent/20")}>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-md font-semibold text-accent flex items-center">
                  <MessageSquareText className="w-5 h-5 mr-2" />
                  AI Trip Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {isLoadingSummary ? (
                  <div className="flex items-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading AI summary...
                  </div>
                ) : currentSummaryText ? (
                  <>
                    <p className="text-card-foreground/90 italic">{currentSummaryText}</p>
                    {summaryGeneratedAt && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                            Generated: {formatDistanceToNow(new Date(summaryGeneratedAt), { addSuffix: true })}
                        </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No summary available. Please try again.</p>
                )}
              </CardContent>
            </Card>

            {/* Visual Timeline Section */}
            <Card className={cn(innerGlassEffectClasses, "border-primary/20")}>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-md font-semibold text-primary flex items-center">
                  <CalendarRange className="w-5 h-5 mr-2" />
                  Daily Visual Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VisualTimelineDisplay dailyPlan={trip.dailyPlan} />
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className={cn("p-4 sm:p-6 border-t border-border/30", "glass-pane")}>
          <Button onClick={onClose} variant="outline" className="glass-interactive">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
