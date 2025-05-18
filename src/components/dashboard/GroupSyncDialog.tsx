
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateGroupSyncReport } from "@/ai/flows/group-sync-flow";
import type { GroupSyncInput, CompanionPreference } from "@/ai/types/group-sync-types";
import type { Itinerary, UserTravelPersona } from "@/lib/types";
import { Loader2Icon, PlusCircleIcon, Trash2Icon, UsersIcon, XIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useGetUserTravelPersona } from "@/lib/firestoreHooks"; // To get planner's persona

type GroupSyncDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  trip: Itinerary | null;
};

const glassEffectClasses = "glass-card";

export function GroupSyncDialog({ isOpen, onClose, trip }: GroupSyncDialogProps) {
  const [companions, setCompanions] = useState<CompanionPreference[]>([
    { id: crypto.randomUUID(), name: "", preferences: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { data: plannerPersona } = useGetUserTravelPersona(); // Fetch current user's (planner's) persona

  useEffect(() => {
    // Reset state when dialog is opened with a new trip or closed
    if (isOpen) {
      setCompanions([{ id: crypto.randomUUID(), name: "", preferences: "" }]);
      setReport(null);
      setIsLoading(false);
    }
  }, [isOpen, trip]);

  if (!trip) return null;

  const handleAddCompanion = () => {
    setCompanions([...companions, { id: crypto.randomUUID(), name: "", preferences: "" }]);
  };

  const handleRemoveCompanion = (id: string) => {
    setCompanions(companions.filter((c) => c.id !== id));
  };

  const handleCompanionChange = (id: string, field: keyof Omit<CompanionPreference, 'id'>, value: string) => {
    setCompanions(
      companions.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const validateInputs = (): boolean => {
    for (const companion of companions) {
      if (!companion.name.trim()) {
        toast({ title: "Input Error", description: `Companion name cannot be empty.`, variant: "destructive" });
        return false;
      }
      if (companion.preferences.trim().length < 5) {
        toast({ title: "Input Error", description: `Preferences for ${companion.name} must be at least 5 characters.`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };
  
  const formatDailyPlanForAI = (dailyPlan: Itinerary['dailyPlan']): string => {
    if (!dailyPlan || dailyPlan.length === 0) return "No detailed daily plan available.";
    return dailyPlan.map(day => `${day.day}: ${day.activities.substring(0, 100)}...`).join('\n');
  };


  const handleGenerateReport = async () => {
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    if (!validateInputs()) return;

    setIsLoading(true);
    setReport(null);

    const groupSyncInput: GroupSyncInput = {
      tripDestination: trip.destination,
      tripTravelDates: trip.travelDates,
      tripSummary: trip.tripSummary,
      tripDailyPlanActivities: formatDailyPlanForAI(trip.dailyPlan),
      plannerPersonaName: plannerPersona?.name,
      companions: companions.map(c => ({ name: c.name, preferences: c.preferences })),
    };

    try {
      const result = await generateGroupSyncReport(groupSyncInput);
      setReport(result.compatibilityReport);
    } catch (error) {
      console.error("Error generating group sync report:", error);
      toast({
        title: "AI Error",
        description: "Could not generate compatibility report. Please try again.",
        variant: "destructive",
      });
      setReport("Failed to generate report due to an error.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassEffectClasses, "sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
           <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
                <DialogTitle className="text-xl font-semibold text-foreground truncate flex items-center">
                    <UsersIcon className="w-6 h-6 mr-2 text-primary" />
                    AI Group Sync Report for {trip.destination}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                    Align your trip with everyone's preferences!
                </DialogDescription>
            </div>
            <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                    <XIcon className="h-5 w-5" />
                </Button>
            </DialogClose>
           </div>
        </DialogHeader>

        <ScrollArea className="flex-grow p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-card-foreground mb-2">Current Trip Details</h3>
              <div className={cn(glassEffectClasses, "p-3 rounded-md text-sm border-border/30 bg-card/50")}>
                <p><span className="font-semibold">Destination:</span> {trip.destination}</p>
                <p><span className="font-semibold">Dates:</span> {trip.travelDates}</p>
                {trip.tripSummary && <p><span className="font-semibold">Summary:</span> {trip.tripSummary}</p>}
                {plannerPersona && <p><span className="font-semibold">Planner's Style (You):</span> {plannerPersona.name} - <span className="italic text-xs">{plannerPersona.description}</span></p>}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-card-foreground mb-3">Companion Preferences</h3>
              {companions.map((companion, index) => (
                <div key={companion.id} className={cn(glassEffectClasses, "p-4 rounded-md mb-3 border-border/30 bg-card/50 relative")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`companionName-${companion.id}`} className="text-xs text-card-foreground/90">Companion #{index + 1} Name</Label>
                      <Input
                        id={`companionName-${companion.id}`}
                        value={companion.name}
                        onChange={(e) => handleCompanionChange(companion.id, "name", e.target.value)}
                        placeholder="E.g., Alex"
                        className="bg-background/70 dark:bg-input border-border/70 focus:bg-input/90"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`companionPrefs-${companion.id}`} className="text-xs text-card-foreground/90">Preferences / Interests</Label>
                      <Textarea
                        id={`companionPrefs-${companion.id}`}
                        value={companion.preferences}
                        onChange={(e) => handleCompanionChange(companion.id, "preferences", e.target.value)}
                        placeholder="E.g., Loves beaches, historical sites, prefers relaxed pace."
                        className="bg-background/70 dark:bg-input border-border/70 focus:bg-input/90 min-h-[60px]"
                        rows={2}
                      />
                    </div>
                  </div>
                  {companions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 text-destructive hover:bg-destructive/10 w-7 h-7"
                      onClick={() => handleRemoveCompanion(companion.id)}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddCompanion} className="mt-2 glass-interactive border-primary/30 text-primary hover:bg-primary/20">
                <PlusCircleIcon className="w-4 h-4 mr-2" /> Add Companion
              </Button>
            </div>

            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-primary" />
                <p>Aura AI is analyzing group preferences...</p>
              </div>
            )}

            {report && !isLoading && (
              <div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">AI Compatibility Report</h3>
                <div className={cn(glassEffectClasses, "p-4 rounded-md border-accent/30 bg-card/50 max-h-96")}>
                  <ScrollArea className="h-full max-h-80"> {/* Inner scroll for long reports */}
                    <div className="prose prose-sm dark:prose-invert prose-headings:text-accent prose-strong:text-card-foreground whitespace-pre-line">
                        {report}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 border-t border-border/30 sticky bottom-0 z-10 bg-card/80 backdrop-blur-sm">
          <Button onClick={handleGenerateReport} disabled={isLoading || companions.length === 0} className="w-full sm:w-auto shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40">
            {isLoading ? <Loader2Icon className="animate-spin" /> : <UsersIcon />}
            Generate Sync Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
