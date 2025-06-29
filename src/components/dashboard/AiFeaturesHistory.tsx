
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageCircleQuestion, ListPlus, Compass, SearchCheck, Eye, SlidersHorizontal, BookOpenText, Layers, Trash2, Loader2, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedAiFeatureResults, useRemoveSavedAiFeatureResult } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import type { SavedAiFeatureResult, SavedCoTravelAgentResponse, SavedItineraryAssistance, SavedSerendipitySuggestion, SavedAuthenticityVerification, SavedArPreview, SavedMoodOptimization, SavedLegend, SavedPostTripAnalysis } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';

const glassCardClasses = "glass-card";

// Individual card components for each feature type
function CoTravelAgentHistoryCard({ item, onDelete }: { item: SavedCoTravelAgentResponse; onDelete: () => void; }) {
  return (
    <Card className={cn(glassCardClasses, "border-teal-500/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    <MessageCircleQuestion className="w-5 h-5 mr-2 text-teal-500"/>
                    AI Co-Travel Agent Response
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                    For: {item.destination} - Saved {formatDistanceToNow(new Date(item.createdAt?.toDate?.() || item.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={onDelete}><Trash2 className="w-4 h-4"/></Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground italic line-clamp-2">Q: "{item.question}"</p>
        <p className="text-sm text-card-foreground/90 mt-1 line-clamp-3">A: "{item.response.answer}"</p>
      </CardContent>
    </Card>
  );
}

function ItineraryAssistanceHistoryCard({ item, onDelete }: { item: SavedItineraryAssistance; onDelete: () => void; }) {
  return (
    <Card className={cn(glassCardClasses, "border-sky-500/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    <ListPlus className="w-5 h-5 mr-2 text-sky-500"/>
                    Itinerary Assistance
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                    For: {item.destination} - Saved {formatDistanceToNow(new Date(item.createdAt?.toDate?.() || item.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={onDelete}><Trash2 className="w-4 h-4"/></Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground italic line-clamp-3">"{item.assistanceResult.assistanceSummary || `${item.assistanceResult.suggestedAdditions.length} suggestions generated`}"</p>
      </CardContent>
    </Card>
  );
}

// Add more history card components here for other types...
// For brevity, I'll add a generic fallback card.
function GenericFeatureHistoryCard({ item, onDelete }: { item: SavedAiFeatureResult; onDelete: () => void; }) {
    const iconMap: { [key: string]: React.ReactNode } = {
        serendipity: <Compass className="w-5 h-5 mr-2 text-accent" />,
        authenticity: <SearchCheck className="w-5 h-5 mr-2 text-orange-500" />,
        arPreview: <Eye className="w-5 h-5 mr-2 text-pink-500" />,
        moodOptimization: <SlidersHorizontal className="w-5 h-5 mr-2 text-green-500" />,
        legendNarrator: <BookOpenText className="w-5 h-5 mr-2 text-yellow-500" />,
        postTripAnalysis: <Layers className="w-5 h-5 mr-2 text-emerald-500" />,
    };
    const titleMap: { [key: string]: string } = {
        serendipity: 'Serendipity Suggestion',
        authenticity: 'Authenticity Verification',
        arPreview: 'AR Preview Insight',
        moodOptimization: 'Mood Optimization Plan',
        legendNarrator: 'Local Legend',
        postTripAnalysis: 'Post-Trip Analysis',
    };
    const destination = (item as any).destination || (item as any).landmarkName || "N/A";
    const title = titleMap[item.featureType] || 'AI Insight';
    return (
     <Card className={cn(glassCardClasses, "border-border/30")}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    {iconMap[item.featureType] || <Sparkles className="w-5 h-5 mr-2" />}
                    {title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                    For: {destination} - Saved {formatDistanceToNow(new Date(item.createdAt?.toDate?.() || item.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={onDelete}><Trash2 className="w-4 h-4"/></Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground italic line-clamp-3">Click to view full details (Feature coming soon).</p>
      </CardContent>
    </Card>
    );
}

export function AiFeaturesHistory() {
  const { currentUser } = useAuth();
  const { data: savedResults, isLoading } = useSavedAiFeatureResults();
  const removeResultMutation = useRemoveSavedAiFeatureResult();
  const { toast } = useToast();
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await removeResultMutation.mutateAsync(itemToDelete);
        toast({ title: "Success", description: "Saved result has been deleted." });
      } catch (error) {
        toast({ title: "Error", description: "Could not delete the saved result.", variant: "destructive" });
      } finally {
        setItemToDelete(null);
      }
    }
  };

  if (!currentUser) return (
     <Card className={cn(glassCardClasses, "p-6 text-center text-muted-foreground")}>
        Log in to see your saved AI insights.
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading saved insights...
      </div>
    );
  }

  if (!savedResults || savedResults.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        <p>You haven't saved any AI feature results yet.</p>
        <p className="text-xs">Use the features above and click "Save" to keep your insights here.</p>
      </div>
    );
  }

  const renderResultCard = (result: SavedAiFeatureResult) => {
    switch (result.featureType) {
      case 'coTravelAgent':
        return <CoTravelAgentHistoryCard item={result} onDelete={() => handleDeleteClick(result.id)} />;
      case 'itineraryAssistance':
        return <ItineraryAssistanceHistoryCard item={result} onDelete={() => handleDeleteClick(result.id)} />;
      // Add other specific cards as they are created
      default:
        return <GenericFeatureHistoryCard item={result} onDelete={() => handleDeleteClick(result.id)} />;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedResults.map(result => (
          <React.Fragment key={result.id}>
            {renderResultCard(result)}
          </React.Fragment>
        ))}
      </div>
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className={cn(glassCardClasses)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this saved result from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={removeResultMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {removeResultMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
