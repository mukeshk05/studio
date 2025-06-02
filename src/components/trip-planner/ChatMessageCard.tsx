
"use client";

import React from 'react';
import type { ChatMessage } from "@/app/(app)/planner/page";
import type { AITripPlannerOutput, AITripPlannerInput } from "@/ai/types/trip-planner-types";
import type { Itinerary, TripPackageSuggestion, SerpApiFlightOption, SerpApiHotelSuggestion } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CompactItineraryCard } from "./CompactItineraryCard";
import { Bot, User, AlertTriangle, Sparkles, Loader2, Info, Send, MessageSquare, Plane as PlaneIcon, Hotel as HotelIcon, Briefcase, Star, Eye, ExternalLink, ImageOff, Route } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";
import NextImage from 'next/image';
import { Button, buttonVariants } from '../ui/button';
import { Badge } from '../ui/badge';


const renderMarkdownLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.substring(lastIndex, match.index));
    parts.push(<Link key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{match[1]}</Link>);
    lastIndex = linkRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.substring(lastIndex));
  return parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>);
};

type CompactTripPackageCardProps = {
  pkg: TripPackageSuggestion;
  onViewPackageOnFullPage: (pkg: TripPackageSuggestion) => void;
};

function CompactTripPackageCard({ pkg, onViewPackageOnFullPage }: CompactTripPackageCardProps) {
  const imageHint = pkg.destinationImageUri?.startsWith('https://placehold.co')
    ? (pkg.destinationImagePrompt || `iconic view of ${pkg.destinationQuery.toLowerCase().split(" ").slice(0,2).join(" ")}`)
    : undefined;

  const viewPackageButtonClasses = cn(
    buttonVariants({ size: "sm" }), 
    "py-1 px-2.5 h-8 text-xs",      
    "shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40",
    "bg-gradient-to-r from-primary to-accent text-primary-foreground",
    "hover:from-accent hover:to-primary",
    "focus-visible:ring-2 focus-visible:ring-primary/40", 
    "transform transition-all duration-300 ease-out hover:scale-[1.01] active:scale-100"
  );

  const isRoundTrip = pkg.flight.type?.toLowerCase() === "round trip";
  const multipleLegs = (pkg.flight.flights?.length || 0) > (isRoundTrip ? 2 : 1);

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-out",
        "glass-card border-primary/30 hover:border-accent/50 hover:scale-[1.015]",
        "bg-gradient-to-br from-primary/10 via-card/60 to-accent/10 dark:from-primary/5 dark:via-card/40 dark:to-accent/5"
      )}
      role="button"
      onClick={() => {
          console.log("CompactTripPackageCard clicked, package ID:", pkg.id); 
          if (typeof onViewPackageOnFullPage === 'function') {
            onViewPackageOnFullPage(pkg);
          } else {
            console.error("onViewPackageOnFullPage is not a function in CompactTripPackageCard. Prop value:", onViewPackageOnFullPage);
          }
        }
      }
      onKeyDown={(e) => { 
        if (e.key === 'Enter' || e.key === ' ') {
          if (typeof onViewPackageOnFullPage === 'function') { 
            onViewPackageOnFullPage(pkg); 
          } else { 
            console.error("onViewPackageOnFullPage is not a function in CompactTripPackageCard (onKeyDown). Prop value:", onViewPackageOnFullPage);
          }
        }
      }}
      tabIndex={0}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-1/3 h-32 sm:h-auto shrink-0 group">
          {pkg.destinationImageUri ? (
            <NextImage src={pkg.destinationImageUri} alt={`Image for ${pkg.destinationQuery}`} fill className="object-cover sm:rounded-l-md sm:rounded-r-none rounded-t-md group-hover:scale-105 transition-transform" data-ai-hint={imageHint} sizes="(max-width: 640px) 100vw, 33vw"/>
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center sm:rounded-l-md sm:rounded-r-none rounded-t-md">
              <ImageOff className="w-10 h-10 text-muted-foreground opacity-70"/>
            </div>
          )}
        </div>
        <div className="flex flex-col flex-grow p-3">
          <CardHeader className="p-0 pb-1.5">
            <CardTitle className="text-sm font-semibold text-card-foreground flex items-center">
              <Briefcase className="w-4 h-4 mr-1.5 text-primary shrink-0" />
              {pkg.destinationQuery}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {pkg.travelDatesQuery} ({pkg.durationDays} days)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 text-xs space-y-1.5 flex-grow">
            {pkg.flight && (
              <div className="p-1 rounded-md border border-border/20 bg-card/30 dark:bg-card/20">
                <div className="font-medium text-card-foreground/90 flex items-center text-[0.7rem]">
                  <PlaneIcon className="w-3 h-3 mr-1 text-primary/80" />
                  {pkg.flight.airline || "Flight"} - ~${pkg.flight.price?.toLocaleString()} 
                  {isRoundTrip && <Badge variant="outline" className="ml-1.5 px-1 py-0 text-[0.6rem] border-primary/40 text-primary/90 bg-primary/5">Round Trip</Badge>}
                </div>
                <p className="text-muted-foreground pl-4 text-[0.65rem] truncate">{pkg.flight.derived_departure_airport_name} → {pkg.flight.derived_arrival_airport_name} ({pkg.flight.derived_stops_description || 'Details inside'})</p>
                {isRoundTrip && multipleLegs && (pkg.flight.flights?.length || 0) > 1 && (
                    <p className="text-muted-foreground pl-4 text-[0.6rem] italic">(Includes return legs)</p>
                )}
              </div>
            )}
            {pkg.hotel && (
              <div className="p-1 rounded-md border border-border/20 bg-card/30 dark:bg-card/20">
                <p className="font-medium text-card-foreground/90 flex items-center text-[0.7rem]">
                  <HotelIcon className="w-3 h-3 mr-1 text-primary/80" />
                  {pkg.hotel.name?.substring(0,25)}... - ~${pkg.hotel.price_per_night?.toLocaleString()}/night
                </p>
                {pkg.hotel.rating !== undefined && pkg.hotel.rating !== null && <p className="text-muted-foreground pl-4 text-[0.65rem]">Rating: {pkg.hotel.rating.toFixed(1)} <Star className="w-2.5 h-2.5 inline-block text-amber-400 fill-amber-400" /></p>}
              </div>
            )}
             <p className="text-xs text-muted-foreground pt-1">AI-powered daily activity suggestions included (conceptual).</p>
          </CardContent>
          <CardFooter className="p-0 pt-2 mt-auto flex justify-between items-center">
             <Badge variant="secondary" className="text-sm py-1 px-2 shadow-sm bg-accent/80 text-accent-foreground border-accent/50">
                Total: ~${pkg.totalEstimatedCost.toLocaleString()}
            </Badge>
            <Button
                className={viewPackageButtonClasses}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" /> View Full Package
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}


type ChatMessageCardProps = {
  message: ChatMessage;
  onViewDetails: (itinerary: Itinerary) => void;
  onViewPackageOnFullPage: (pkg: TripPackageSuggestion) => void;
};

export function ChatMessageCard({ message, onViewDetails, onViewPackageOnFullPage: receivedOnViewPackageOnFullPageProp }: ChatMessageCardProps) {
  const isUser = message.type === "user";
  const bubbleAlignment = isUser ? "justify-end" : "justify-start";
  const bubbleClasses = isUser
    ? "bg-primary text-primary-foreground rounded-br-none shadow-md shadow-primary/30"
    : "glass-card bg-card/70 dark:bg-card/50 rounded-bl-none border-border/50";

  const renderPayload = () => {
    switch (message.type) {
      case "user":
        const userPayload = message.payload as any; 
        if (userPayload && typeof userPayload.text === 'string') {
          return <p>{userPayload.text}</p>;
        } else if (userPayload && typeof userPayload.destination === 'string' && typeof userPayload.budget === 'number' && typeof userPayload.travelDates === 'string') {
          const requestInput = userPayload as AITripPlannerInput; 
          return (
            <div>
              <p className="font-semibold text-sm mb-1">{message.title || "My Trip Request:"}</p>
              {requestInput.origin && <p><strong>Origin:</strong> {requestInput.origin}</p>}
              <p><strong>Destination:</strong> {requestInput.destination}</p>
              <p><strong>Dates:</strong> {requestInput.travelDates}</p>
              <p><strong>Budget:</strong> ${requestInput.budget.toLocaleString()}</p>
              {requestInput.desiredMood && <p><strong>Mood:</strong> {requestInput.desiredMood}</p>}
              {requestInput.riskContext && <p><strong>Concerns/Preferences:</strong> {requestInput.riskContext}</p>}
              {requestInput.weatherContext && <p><strong>Weather Note:</strong> {requestInput.weatherContext}</p>}
            </div>
          );
        }
        return <p>My message (details unavailable)</p>;

      case "ai":
        const aiOutput = message.payload as AITripPlannerOutput;
        const itineraries = aiOutput.itineraries as Itinerary[];
        if (!itineraries || itineraries.length === 0) {
          return <p>I couldn't find any itineraries based on your request. This could be due to limited real-time flight/hotel availability for your specific query, or the AI couldn't form a plan with the options found. Please try different criteria.</p>;
        }
        return (
          <div className="space-y-3">
            {aiOutput.personalizationNote && (
              <div className={cn("p-2 mb-3 rounded-md text-xs italic", "bg-primary/10 text-primary border border-primary/20 flex items-center gap-2")}>
                <Info className="w-4 h-4 shrink-0" /> <span>{aiOutput.personalizationNote}</span>
              </div>
            )}
            {itineraries.map((itinerary) => (
              <CompactItineraryCard key={itinerary.id} itinerary={itinerary} onViewDetails={() => onViewDetails(itinerary)} />
            ))}
          </div>
        );
      case "ai_text_response":
        return <div className="whitespace-pre-line">{renderMarkdownLinks(message.payload as string)}</div>;
      case "error":
        return (
          <div className="flex items-center text-destructive-foreground bg-destructive/80 p-3 rounded-md">
            <AlertTriangle className="w-5 h-5 mr-2" /> <p>{message.payload as string}</p>
          </div>
        );
      case "system":
        return <div className="text-sm text-muted-foreground italic py-2 animate-fade-in whitespace-pre-line">{message.payload as string}</div>;
      case "loading":
        return (
          <div className="flex items-center text-card-foreground">
            <Sparkles className="w-5 h-5 mr-3 animate-pulse text-primary" /> <span>{message.payload as string || "BudgetRoam AI is thinking..."}</span>
          </div>
        );
      case "booking_guidance":
        return (
          <Card className={cn("shadow-none border-none p-0 bg-transparent")}>
            <CardHeader className="p-0 pb-2"><CardTitle className="text-base flex items-center text-card-foreground"><Send className="w-4 h-4 mr-2 text-primary" />{message.title || "Booking Guidance"}</CardTitle></CardHeader>
            <CardContent className="p-0 text-sm text-card-foreground/90 whitespace-pre-line">{renderMarkdownLinks(message.payload as string)}</CardContent>
          </Card>
        );
      case "trip_package_suggestions":
        const packageData = message.payload as { packages: TripPackageSuggestion[], note: string, userInput: AITripPlannerInput };
        return (
          <Card className="shadow-none border-none p-0 bg-transparent text-sm">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base flex items-center text-card-foreground">
                <Briefcase className="w-4 h-4 mr-2 text-primary" />
                {message.title || "Curated Trip Packages by Aura AI"}
              </CardTitle>
              {packageData.userInput && (
                <CardDescription className="text-xs text-muted-foreground">
                  For: {packageData.userInput.destination}, {packageData.userInput.travelDates}, Budget: ~${packageData.userInput.budget.toLocaleString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-0 text-card-foreground/90 space-y-3">
              <p className="text-xs italic p-2 bg-primary/5 border border-primary/20 rounded-md">{packageData.note}</p>
              {packageData.packages.length > 0 ? (
                <div className="space-y-3">
                  {packageData.packages.map((pkg) => (
                    <CompactTripPackageCard
                      key={pkg.id}
                      pkg={pkg}
                      onViewPackageOnFullPage={receivedOnViewPackageOnFullPageProp} 
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-3">No trip packages could be created with the current filtered options. Try adjusting your budget or criteria.</p>
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  let IconToUse = isUser ? User : Bot;
  let iconBgClass = isUser ? "bg-muted/50" : "bg-primary/20 text-primary";

  if (message.type === 'loading') IconToUse = Loader2;
  else if (message.type === 'booking_guidance') { IconToUse = Send; iconBgClass = "bg-accent/20 text-accent"; }
  else if (message.type === 'ai_text_response') { IconToUse = MessageSquare; iconBgClass = "bg-teal-500/20 text-teal-500"; }
  else if (message.type === 'trip_package_suggestions') { IconToUse = Briefcase; iconBgClass = "bg-blue-500/20 text-blue-500"; }
  else if (message.type === 'error') IconToUse = AlertTriangle;

  if (message.type === 'system') {
     return <div className="text-center text-sm text-muted-foreground italic py-2 animate-fade-in whitespace-pre-line">{message.payload as string}</div>;
  }
   if (message.type === 'error') {
     return (
        <div className={cn("flex items-start gap-3 animate-fade-in", bubbleAlignment)}>
            {!isUser && (<Avatar className="w-8 h-8 shrink-0 border-2 border-destructive"><AvatarFallback className="bg-destructive text-destructive-foreground"><IconToUse /></AvatarFallback></Avatar>)}
            <div className={cn("max-w-[85%] sm:max-w-[75%] p-0")}><CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses, "bg-destructive text-destructive-foreground whitespace-pre-line")}>{renderPayload()}</CardContent><p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>{format(message.timestamp, "p")}</p></div>
             {isUser && (<Avatar className="w-8 h-8 shrink-0 border border-primary/50"><AvatarFallback className="bg-muted/50"><User /></AvatarFallback></Avatar>)}
        </div>
     )
   }

  return (
    <div className={cn("flex items-end gap-3 animate-fade-in", bubbleAlignment)}>
      {!isUser && (<Avatar className="w-8 h-8 shrink-0 border border-primary/50"><AvatarFallback className={cn(iconBgClass)}><IconToUse className={message.type === 'loading' ? 'animate-spin' : ''} /></AvatarFallback></Avatar>)}
      <div className={cn("max-w-[85%] sm:max-w-[75%] p-0")}><CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses, message.type === 'loading' && "py-4", message.type === 'ai_text_response' && "bg-card/80 dark:bg-card/60 border-teal-500/40", message.type === 'trip_package_suggestions' && "bg-card/80 dark:bg-card/60 border-blue-500/40", "whitespace-pre-line")}>{renderPayload()}</CardContent><p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>{message.type !== 'loading' ? format(message.timestamp, "p") : (message.payload as string || "Thinking...")}</p></div>
      {isUser && (<Avatar className="w-8 h-8 shrink-0 border border-primary/50"><AvatarFallback className="bg-muted/50"><User /></AvatarFallback></Avatar>)}
    </div>
  );
}
