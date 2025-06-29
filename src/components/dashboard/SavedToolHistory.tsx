
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ListChecks, GitCompareArrows, Accessibility, Trash2, History, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSavedToolResults, useRemoveSavedToolResult } from "@/lib/firestoreHooks";
import { useToast } from "@/hooks/use-toast";
import type { SavedToolResult, SavedPackingList, SavedComparison, SavedAccessibilityReport } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';

const glassCardClasses = "glass-card";

function PackingListHistoryCard({ item, onDelete }: { item: SavedPackingList; onDelete: () => void; }) {
  return (
    <Card className={cn(glassCardClasses, "border-green-500/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    <ListChecks className="w-5 h-5 mr-2 text-green-500"/>
                    Packing List
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                    For: {item.destination} ({item.travelDates}) - Saved {formatDistanceToNow(new Date(item.createdAt?.toDate?.() || item.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={onDelete}><Trash2 className="w-4 h-4"/></Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto pr-2">
          {item.packingList.slice(0, 5).map((listItem, i) => <li key={i}>{listItem}</li>)}
          {item.packingList.length > 5 && <li>...and {item.packingList.length - 5} more items.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

function ComparisonHistoryCard({ item, onDelete }: { item: SavedComparison; onDelete: () => void; }) {
  return (
    <Card className={cn(glassCardClasses, "border-orange-500/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    <GitCompareArrows className="w-5 h-5 mr-2 text-orange-500"/>
                    Comparison Result
                </CardTitle>
                 <CardDescription className="text-xs text-muted-foreground mt-1">
                    {item.destination1} vs {item.destination2} for "{item.travelInterest}" - Saved {formatDistanceToNow(new Date(item.createdAt?.toDate?.() || item.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
             <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={onDelete}><Trash2 className="w-4 h-4"/></Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground italic line-clamp-3">"{item.analysisResult.comparisonSummary}"</p>
      </CardContent>
    </Card>
  );
}

function AccessibilityHistoryCard({ item, onDelete }: { item: SavedAccessibilityReport; onDelete: () => void; }) {
  return (
    <Card className={cn(glassCardClasses, "border-blue-500/20")}>
       <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-md font-semibold text-card-foreground flex items-center">
                    <Accessibility className="w-5 h-5 mr-2 text-blue-500"/>
                    Accessibility Report
                </CardTitle>
                 <CardDescription className="text-xs text-muted-foreground mt-1">
                    For: {item.destination} - Saved {formatDistanceToNow(new Date(item.createdAt?.toDate?.() || item.createdAt), { addSuffix: true })}
                </CardDescription>
            </div>
             <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={onDelete}><Trash2 className="w-4 h-4"/></Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground italic line-clamp-2">"{item.report.overallAssessment}"</p>
         <p className="text-xs text-muted-foreground mt-2"><strong>Needs considered:</strong> "{item.accessibilityNeeds.substring(0, 80)}..."</p>
      </CardContent>
    </Card>
  );
}


export function SavedToolHistory() {
  const { currentUser } = useAuth();
  const { data: savedResults, isLoading } = useSavedToolResults();
  const removeResultMutation = useRemoveSavedToolResult();
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

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading saved results...
      </div>
    );
  }

  if (!savedResults || savedResults.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        <p>You haven't saved any tool results yet.</p>
        <p className="text-xs">Use the tools above and click "Save" to keep your insights here.</p>
      </div>
    );
  }

  const renderResultCard = (result: SavedToolResult) => {
    switch (result.toolType) {
      case 'packingList':
        return <PackingListHistoryCard item={result} onDelete={() => handleDeleteClick(result.id)} />;
      case 'comparison':
        return <ComparisonHistoryCard item={result} onDelete={() => handleDeleteClick(result.id)} />;
      case 'accessibilityReport':
        return <AccessibilityHistoryCard item={result} onDelete={() => handleDeleteClick(result.id)} />;
      default:
        return null;
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

export default SavedToolHistory;
