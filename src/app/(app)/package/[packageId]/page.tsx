
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertTriangle, ArrowLeft, Ticket, Save, Info } from 'lucide-react';
import { PackageDetailView } from '@/components/trip-planner/PackageDetailView';
import type { TripPackageSuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAddSavedPackage } from '@/lib/firestoreHooks';
import { useToast } from '@/hooks/use-toast';

const glassCardClasses = "glass-card";
const prominentButtonClasses = "text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";


export default function FullPackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const addSavedPackageMutation = useAddSavedPackage();
  const { toast } = useToast();

  const [packageDetail, setPackageDetail] = useState<TripPackageSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.packageId && typeof params.packageId === 'string') {
      try {
        const storedData = localStorage.getItem(`tripPackageData_${params.packageId}`);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setPackageDetail(parsedData);
        } else {
          setError("Package details not found. It might have expired or the link is incorrect.");
        }
      } catch (e) {
        console.error("Error reading package data from localStorage:", e);
        setError("Could not load package details. Please try again from the planner.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Invalid package identifier.");
      setIsLoading(false);
    }
  }, [params.packageId]);

  const handleSavePackage = async () => {
    if (!packageDetail) return;
     if (!currentUser?.uid) {
      toast({ title: "Authentication Error", description: "Please log in to save this package.", variant: "destructive"});
      return;
    }
    const packageToSave: TripPackageSuggestion = { ...packageDetail, userId: currentUser.uid, createdAt: new Date().toISOString() };

    try {
      await addSavedPackageMutation.mutateAsync(packageToSave);
      toast({ title: "Package Saved!", description: `Trip package to ${packageDetail.destinationQuery} saved to your dashboard.` });
    } catch (err: any) {
      toast({ title: "Save Error", description: err.message || "Could not save the trip package.", variant: "destructive" });
    }
  };

  const handlePlanPackageWithAI = () => {
    if (!packageDetail) return;
    localStorage.setItem('tripBundleToPlan', JSON.stringify(packageDetail.userInput));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan'));
    router.push('/planner');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading package details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <Card className={cn(glassCardClasses, "max-w-md mx-auto border-destructive/50")}>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 mr-2" /> Error Loading Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
            <Button onClick={() => router.push('/planner')} className="mt-6">
              <ArrowLeft className="mr-2" /> Back to Planner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!packageDetail) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <p className="text-muted-foreground">Package details could not be loaded.</p>
         <Button onClick={() => router.push('/planner')} className="mt-6">
            <ArrowLeft className="mr-2" /> Back to Planner
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => router.push('/planner')} className="glass-interactive">
          <ArrowLeft className="mr-2" /> Back to AI Planner
        </Button>
      </div>

      <Card className={cn(glassCardClasses, "mb-8 border-primary/30")}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Trip Package to {packageDetail.destinationQuery}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Dates: {packageDetail.travelDatesQuery} ({packageDetail.durationDays} days) | Original User Budget: ~${packageDetail.userInput.budget.toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <PackageDetailView tripPackage={packageDetail} />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
         <Button
            onClick={handleSavePackage}
            variant="outline"
            size="lg" 
            className={cn("w-full glass-interactive border-accent/50 text-accent hover:bg-accent/10 text-lg py-3", addSavedPackageMutation.isPending && "opacity-70 cursor-not-allowed")}
            disabled={addSavedPackageMutation.isPending || !currentUser}
          >
            {addSavedPackageMutation.isPending ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
            {addSavedPackageMutation.isPending ? "Saving..." : (currentUser ? "Save This Package" : "Log In to Save")}
        </Button>
        <Button onClick={handlePlanPackageWithAI} size="lg" className={cn("w-full", prominentButtonClasses)}>
            <Ticket className="mr-2" /> Continue Planning with AI
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4 flex items-center justify-center">
        <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
        This is a detailed view of the AI-curated trip package.
      </p>
    </div>
  );
}
