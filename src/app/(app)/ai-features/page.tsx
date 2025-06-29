
"use client";

import React from "react";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { Sparkles, MessageCircleQuestion, ConciergeBell, History } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Loading component for dynamic imports
const FeatureCardSkeleton = () => (
  <Skeleton className="w-full h-[400px] rounded-lg bg-card/50" />
);

// Dynamic imports for each feature card
const AiChatInteractionCard = dynamic(() => import('@/components/dashboard/AiChatInteractionCard').then(mod => mod.AiChatInteractionCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AiItineraryAssistanceCard = dynamic(() => import('@/components/dashboard/AiItineraryAssistancePlaceholder').then(mod => mod.AiItineraryAssistanceCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const SerendipityEnginePlaceholder = dynamic(() => import('@/components/dashboard/SerendipityEnginePlaceholder').then(mod => mod.SerendipityEnginePlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AuthenticityVerifierPlaceholder = dynamic(() => import('@/components/dashboard/AuthenticityVerifierPlaceholder').then(mod => mod.AuthenticityVerifierPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AiArPreviewPlaceholder = dynamic(() => import('@/components/dashboard/AiArPreviewPlaceholder').then(mod => mod.AiArPreviewPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const MoodEnergyOptimizerCard = dynamic(() => import('@/components/dashboard/MoodEnergyOptimizerPlaceholder').then(mod => mod.MoodEnergyOptimizerCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const HyperLocalLanguageCoachPlaceholder = dynamic(() => import('@/components/dashboard/HyperLocalLanguageCoachPlaceholder').then(mod => mod.HyperLocalLanguageCoachPlaceholder), { loading: () => <FeatureCardSkeleton />, ssr: false });
const LocalLegendNarratorCard = dynamic(() => import('@/components/dashboard/LocalLegendNarratorPlaceholder').then(mod => mod.LocalLegendNarratorCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const PostTripSynthesizerCard = dynamic(() => import('@/components/dashboard/PostTripSynthesizerPlaceholder').then(mod => mod.PostTripSynthesizerCard), { loading: () => <FeatureCardSkeleton />, ssr: false });
const AiFeaturesHistory = dynamic(() => import('@/components/dashboard/AiFeaturesHistory').then(mod => mod.AiFeaturesHistory), { loading: () => <Skeleton className="w-full h-64 rounded-lg bg-card/50" />, ssr: false });


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
