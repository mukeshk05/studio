
"use client";

import React from "react";
import { useSavedIdeas, useRemoveSavedIdea } from "@/lib/firestoreHooks";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Wand2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { SavedIdea } from "@/lib/types";
import { useRouter } from "next/navigation";

const glassCardClasses = "glass-card";

function SavedIdeaCard({ savedIdea, onRemove, onPlan }: { savedIdea: SavedIdea; onRemove: (id: string) => void; onPlan: (idea: SavedIdea) => void; }) {
  const { bundle } = savedIdea;
  return (
    <Card className={cn(glassCardClasses, "border-border/30 w-full group transition-all hover:border-accent/40")}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-semibold text-accent group-hover:text-primary transition-colors">{bundle.bundleName}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              To: {bundle.tripIdea.destination}
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground">
              Saved {formatDistanceToNow(new Date(savedIdea.createdAt?.toDate?.() || savedIdea.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:bg-destructive/10 z-10" onClick={(e) => { e.stopPropagation(); onRemove(savedIdea.id); }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2 pb-3">
        <p className="italic line-clamp-2">"{bundle.reasoning}"</p>
        <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => onPlan(savedIdea)} className="text-xs h-7">Plan this Idea</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SavedIdeasHistory() {
  const { currentUser } = useAuth();
  const { data: savedIdeas, isLoading } = useSavedIdeas();
  const removeIdeaMutation = useRemoveSavedIdea();
  const { toast } = useToast();
  const router = useRouter();

  const handleRemove = async (id: string) => {
    await removeIdeaMutation.mutateAsync(id, {
      onSuccess: () => toast({ title: "Success", description: "AI idea removed from your history." }),
      onError: (error) => toast({ title: "Error", description: `Could not remove item: ${error.message}`, variant: "destructive" }),
    });
  };
  
  const handlePlanIdea = (idea: SavedIdea) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(idea.bundle.tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  if (!currentUser) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p>Log in to save and view your AI-generated trip ideas.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center text-muted-foreground py-10">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading your saved ideas...
      </div>
    );
  }

  if (!savedIdeas || savedIdeas.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Wand2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="font-semibold">No Saved Ideas Yet</p>
        <p className="text-sm">Use the "Predictive Preference Fusion" tool to generate and save trip ideas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {savedIdeas.map(idea => (
        <SavedIdeaCard key={idea.id} savedIdea={idea} onRemove={handleRemove} onPlan={handlePlanIdea} />
      ))}
    </div>
  );
}
