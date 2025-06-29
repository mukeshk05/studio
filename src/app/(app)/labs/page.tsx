
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { BrainCircuit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

// Loading component for dynamic imports
const FeatureCardSkeleton = () => (
  <Skeleton className="w-full h-[400px] rounded-lg bg-card/50" />
);

// Dynamic imports for each conceptual feature card
const ProactiveJourneySentinelCard = dynamic(() => import('@/components/dashboard/ProactiveJourneySentinelCard').then(mod => mod.ProactiveJourneySentinelCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AiCalendarSyncCard = dynamic(() => import('@/components/dashboard/AiCalendarSyncPlaceholder').then(mod => mod.AiCalendarSyncCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const DigitalTwinExplorerPlaceholder = dynamic(() => import('@/components/dashboard/DigitalTwinExplorerPlaceholder').then(mod => mod.DigitalTwinExplorerPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AffectiveComputingPlaceholder = dynamic(() => import('@/components/dashboard/AffectiveComputingPlaceholder').then(mod => mod.AffectiveComputingPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const EthicalImpactAuditorPlaceholder = dynamic(() => import('@/components/dashboard/EthicalImpactAuditorPlaceholder').then(mod => mod.EthicalImpactAuditorPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const DynamicItineraryOptimizerPlaceholder = dynamic(() => import('@/components/dashboard/DynamicItineraryOptimizerPlaceholder').then(mod => mod.DynamicItineraryOptimizerPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const VisualSearchPlaceholder = dynamic(() => import('@/components/dashboard/VisualSearchPlaceholder').then(mod => mod.VisualSearchPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });

export default function LabsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center">
          <BrainCircuit className="w-10 h-10 mr-4 text-primary" />
          BudgetRoam Labs
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          A conceptual showcase of future-vision AI features that could redefine travel planning.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.1s'}}>
          <ProactiveJourneySentinelCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.2s'}}>
          <DynamicItineraryOptimizerPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.3s'}}>
          <AiCalendarSyncCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.4s'}}>
          <VisualSearchPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.5s'}}>
          <DigitalTwinExplorerPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.6s'}}>
          <EthicalImpactAuditorPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.7s'}}>
          <AffectiveComputingPlaceholder />
        </div>
      </div>
    </div>
  );
}
