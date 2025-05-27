
"use client";

import React from 'react';
import type { ChatMessage } from "@/app/(app)/planner/page"; // Import PreFilteredOptions
import type { AITripPlannerInput, AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import type { Itinerary, TripPackageSuggestion, SerpApiFlightOption, SerpApiHotelSuggestion } from "@/lib/types"; // Added TripPackageSuggestion
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CompactItineraryCard } from "./CompactItineraryCard";
import { Bot, User, AlertTriangle, Sparkles, Loader2, Info, Send, MessageSquare, Plane as PlaneIcon, Hotel as HotelIcon, Briefcase, Star, Eye, ExternalLink } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from 'next/image';
import { Button } from '../ui/button';
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
  onViewPackageDetails: (pkg: TripPackageSuggestion) => void;
};

function CompactTripPackageCard({ pkg, onViewPackageDetails }: CompactTripPackageCardProps) {
  const flight = pkg.flight;
  const hotel = pkg.hotel;

  return (
    <Card className={cn("overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 glass-card hover:border-primary/50")}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base flex items-center text-card-foreground">
          <Briefcase className="w-4 h-4 mr-2 text-primary shrink-0" />
          Trip Package to {pkg.destinationQuery}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          For: {pkg.travelDatesQuery} ({pkg.durationDays} days)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 text-xs space-y-2">
        {flight && (
          <div className="p-1.5 rounded-md border border-border/30 bg-card/50">
            <p className="font-medium text-card-foreground/90 flex items-center"><PlaneIcon className="w-3 h-3 mr-1 text-primary" /> Flight: {flight.airline || "Selected Airline"} - ${flight.price?.toLocaleString()}</p>
            <p className="text-muted-foreground pl-4 text-[0.7rem]">{flight.derived_departure_airport_name} to {flight.derived_arrival_airport_name} ({flight.derived_stops_description})</p>
          </div>
        )}
        {hotel && (
          <div className="p-1.5 rounded-md border border-border/30 bg-card/50">
            <p className="font-medium text-card-foreground/90 flex items-center"><HotelIcon className="w-3 h-3 mr-1 text-primary" /> Hotel: {hotel.name?.substring(0,30)}... - ~${hotel.price_per_night?.toLocaleString()}/night</p>
            {hotel.rating && <p className="text-muted-foreground pl-4 text-[0.7rem]">Rating: {hotel.rating.toFixed(1)} ★</p>}
          </div>
        )}
         <Badge variant="secondary" className="text-sm py-1 px-2.5 mt-1.5 bg-primary/20 text-primary border-primary/30 shadow-sm">
            Total: ~${pkg.totalEstimatedCost.toLocaleString()}
        </Badge>
      </CardContent>
      <CardFooter className="p-3">
        <Button onClick={() => onViewPackageDetails(pkg)} size="sm" className="w-full text-xs h-8 glass-interactive border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">
          <Eye className="w-3.5 h-3.5 mr-1.5" /> View Full Package Details
        </Button>
      </CardFooter>
    </Card>
  );
}


type ChatMessageCardProps = {
  message: ChatMessage;
  onViewDetails: (itinerary: Itinerary) => void;
  onViewPackageDetails: (pkg: TripPackageSuggestion) => void; // New prop
};

export function ChatMessageCard({ message, onViewDetails, onViewPackageDetails }: ChatMessageCardProps) {
  const isUser = message.type === "user";
  const bubbleAlignment = isUser ? "justify-end" : "justify-start";
  const bubbleClasses = isUser
    ? "bg-primary text-primary-foreground rounded-br-none shadow-md shadow-primary/30"
    : "glass-card bg-card/70 dark:bg-card/50 rounded-bl-none border-border/50";

  const renderPayload = () => {
    switch (message.type) {
      case "user":
        const userInputPayload = message.payload as AITripPlannerInput | { text: string };
        if ('destination' in userInputPayload) {
          const input = userInputPayload as AITripPlannerInput;
          return (
            <div>
              <p className="font-semibold text-sm mb-1">{message.title || "My Trip Request:"}</p>
              {input.origin && <p><strong>Origin:</strong> {input.origin}</p>}
              <p><strong>Destination:</strong> {input.destination}</p>
              <p><strong>Dates:</strong> {input.travelDates}</p>
              <p><strong>Budget:</strong> ${input.budget.toLocaleString()}</p>
              {input.desiredMood && <p><strong>Mood:</strong> {input.desiredMood}</p>}
              {input.riskContext && <p><strong>Concerns:</strong> {input.riskContext}</p>}
              {input.weatherContext && <p><strong>Weather Context:</strong> {input.weatherContext}</p>}
            </div>
          );
        } else if ('text' in userInputPayload) {
           return <p>{(userInputPayload as { text: string }).text}</p>;
        }
        return <p>My message</p>;

      case "ai":
        const aiOutput = message.payload as AITripPlannerOutput;
        const itineraries = aiOutput.itineraries as Itinerary[];
        if (!itineraries || itineraries.length === 0) {
          return <p>No trip options found for your request.</p>;
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
        return <div className="text-sm text-muted-foreground italic whitespace-pre-line"><p>{message.payload as string}</p></div>;
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
                {message.title || "Curated Trip Packages"}
              </CardTitle>
              {packageData.userInput && (
                <CardDescription className="text-xs text-muted-foreground">
                  For: {packageData.userInput.destination}, {packageData.userInput.travelDates}, Budget: ${packageData.userInput.budget.toLocaleString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-0 text-card-foreground/90 space-y-3">
              <p className="text-xs italic p-2 bg-primary/5 border border-primary/20 rounded-md">{packageData.note}</p>
              {packageData.packages.length > 0 ? (
                <div className="space-y-3">
                  {packageData.packages.map((pkg) => (
                    <CompactTripPackageCard key={pkg.id} pkg={pkg} onViewPackageDetails={onViewPackageDetails} />
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
