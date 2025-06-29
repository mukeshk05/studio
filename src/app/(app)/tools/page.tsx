
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Briefcase } from 'lucide-react';
import { SmartPackingListCard } from "@/components/dashboard/SmartPackingListCard";
import { LocalInsiderTipsCard } from "@/components/dashboard/LocalInsiderTipsCard";
import { InteractiveMapPlaceholder } from "@/components/dashboard/InteractiveMapPlaceholder";
import { WhatIfSimulatorPlaceholder } from "@/components/dashboard/WhatIfSimulatorPlaceholder";
import { PersonalizedAccessibilityScoutCard } from "@/components/dashboard/PersonalizedAccessibilityScoutPlaceholder";
import { AiRiskScenarioSimulatorCard } from "@/components/dashboard/AiRiskScenarioSimulatorCard";
import { WhatIfPlanChangeCard } from "@/components/dashboard/WhatIfPlanChangeCard";
import { SmartBudgetingAssistantPlaceholder } from "@/components/dashboard/SmartBudgetingAssistantPlaceholder";

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
    </div>
  );
}
