
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircleQuestion, ConciergeBell, History } from 'lucide-react';
import { SerendipityEnginePlaceholder } from "@/components/dashboard/SerendipityEnginePlaceholder";
import { AuthenticityVerifierPlaceholder } from "@/components/dashboard/AuthenticityVerifierPlaceholder";
import { AiArPreviewPlaceholder } from "@/components/dashboard/AiArPreviewPlaceholder";
import { AiChatInteractionCard } from "@/components/dashboard/AiChatInteractionCard";
import { MoodEnergyOptimizerCard } from "@/components/dashboard/MoodEnergyOptimizerPlaceholder";
import { HyperLocalLanguageCoachPlaceholder } from "@/components/dashboard/HyperLocalLanguageCoachPlaceholder";
import { LocalLegendNarratorCard } from "@/components/dashboard/LocalLegendNarratorPlaceholder";
import { AiItineraryAssistanceCard } from "@/components/dashboard/AiItineraryAssistancePlaceholder";
import { PostTripSynthesizerCard } from "@/components/dashboard/PostTripSynthesizerPlaceholder";
import { Separator } from "@/components/ui/separator";
import { AiFeaturesHistory } from "@/components/dashboard/AiFeaturesHistory";

export default function AiFeaturesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center">
          <Sparkles className="w-10 h-10 mr-4 text-primary" />
          AI-Powered Features
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Explore unique, AI-driven experiences to enhance your travels from start to finish.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.1s'}}>
            <AiChatInteractionCard 
                cardTitle="AI Co-Travel Agent (Aura)"
                cardDescription="Ask Aura any travel-related question about your destination! (e.g., customs, tipping, local laws, phrases)."
                icon={<MessageCircleQuestion className="w-6 h-6 mr-2 text-teal-400" />}
                defaultDestinationPlaceholder="e.g., Paris, France"
                cardBorderColorClass="border-teal-500/30"
            />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.2s'}}>
            <AiItineraryAssistanceCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.3s'}}>
            <SerendipityEnginePlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.4s'}}>
            <AuthenticityVerifierPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.5s'}}>
            <AiArPreviewPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.6s'}}>
            <AiChatInteractionCard 
                cardTitle="Aura In-Trip Concierge (Conceptual)"
                cardDescription="Get real-time help during your travels. Ask for recommendations, directions, or local info. (Uses the same AI as Co-Travel Agent for this demo)"
                icon={<ConciergeBell className="w-6 h-6 mr-2 text-indigo-400" />}
                defaultDestinationPlaceholder="Your Current Destination"
                cardBorderColorClass="border-indigo-500/30"
            />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.7s'}}>
            <MoodEnergyOptimizerCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.8s'}}>
            <HyperLocalLanguageCoachPlaceholder />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '0.9s'}}>
            <LocalLegendNarratorCard />
        </div>
        <div className={cn("lg:col-span-3", "animate-fade-in-up")} style={{animationDelay: '1.0s'}}>
            <PostTripSynthesizerCard />
        </div>
      </div>
      
      <Separator className="my-12 border-border/40" />

      <section className="animate-fade-in-up" style={{animationDelay: '1.1s'}}>
        <header className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
                <History className="w-8 h-8 mr-3 text-primary" />
                Your Saved AI Insights
            </h2>
            <p className="text-md text-muted-foreground mt-1">
                Revisit the suggestions and analyses you've saved from the AI features.
            </p>
        </header>
        <AiFeaturesHistory />
      </section>
    </div>
  );
}
