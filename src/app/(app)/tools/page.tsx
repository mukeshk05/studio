
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Briefcase, History } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Skeletons for dynamic components
const FeatureCardSkeleton = () => <Skeleton className="w-full h-[450px] rounded-lg bg-card/50" />;
const HistorySkeleton = () => <Skeleton className="w-full h-64 rounded-lg bg-card/50" />;

// Dynamic Imports for Feature Cards
const SmartPackingListCard = dynamic(() => import('@/components/dashboard/SmartPackingListCard').then(mod => mod.SmartPackingListCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const LocalInsiderTipsCard = dynamic(() => import('@/components/dashboard/LocalInsiderTipsCard').then(mod => mod.LocalInsiderTipsCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const InteractiveMapPlaceholder = dynamic(() => import('@/components/dashboard/InteractiveMapPlaceholder').then(mod => mod.InteractiveMapPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const WhatIfSimulatorPlaceholder = dynamic(() => import('@/components/dashboard/WhatIfSimulatorPlaceholder').then(mod => mod.WhatIfSimulatorPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const PersonalizedAccessibilityScoutCard = dynamic(() => import('@/components/dashboard/PersonalizedAccessibilityScoutPlaceholder').then(mod => mod.PersonalizedAccessibilityScoutCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AiRiskScenarioSimulatorCard = dynamic(() => import('@/components/dashboard/AiRiskScenarioSimulatorCard').then(mod => mod.AiRiskScenarioSimulatorCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const WhatIfPlanChangeCard = dynamic(() => import('@/components/dashboard/WhatIfPlanChangeCard').then(mod => mod.WhatIfPlanChangeCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const SmartBudgetingAssistantPlaceholder = dynamic(() => import('@/components/dashboard/SmartBudgetingAssistantPlaceholder').then(mod => mod.SmartBudgetingAssistantPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const SavedToolHistory = dynamic(() => import('@/components/dashboard/SavedToolHistory').then(mod => mod.SavedToolHistory), { loading: () => <HistorySkeleton />, ssr: false });


export default function ToolsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center">
          <Briefcase className="w-10 h-10 mr-4 text-primary" />
          Traveler's Toolkit
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Practical AI-powered tools to help you prepare for your trip.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.1s'}}>
          <SmartPackingListCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.2s'}}>
          <LocalInsiderTipsCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.3s'}}>
          <SmartBudgetingAssistantPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.4s'}}>
          <InteractiveMapPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.5s'}}>
          <WhatIfSimulatorPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.6s'}}>
          <AiRiskScenarioSimulatorCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.7s'}}>
          <WhatIfPlanChangeCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.8s'}}>
          <PersonalizedAccessibilityScoutCard />
        </div>
      </div>
      
      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '0.9s'}}>
        <header className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
                <History className="w-8 h-8 mr-3 text-primary" />
                Your Saved Tool Results
            </h2>
            <p className="text-md text-muted-foreground mt-1">
                Revisit the insights and lists you've saved from the toolkit.
            </p>
        </header>
        <SavedToolHistory />
      </section>

    </div>
  );
}
