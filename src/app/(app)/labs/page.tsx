
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { BrainCircuit } from 'lucide-react';
import { ProactiveJourneySentinelCard } from "@/components/dashboard/ProactiveJourneySentinelCard";
import { AiCalendarSyncCard } from "@/components/dashboard/AiCalendarSyncPlaceholder";
import { DigitalTwinExplorerPlaceholder } from "@/components/dashboard/DigitalTwinExplorerPlaceholder";
import { AffectiveComputingPlaceholder } from "@/components/dashboard/AffectiveComputingPlaceholder";
import { EthicalImpactAuditorPlaceholder } from "@/components/dashboard/EthicalImpactAuditorPlaceholder";
import { DynamicItineraryOptimizerPlaceholder } from "@/components/dashboard/DynamicItineraryOptimizerPlaceholder";
import { VisualSearchPlaceholder } from "@/components/dashboard/VisualSearchPlaceholder";

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
