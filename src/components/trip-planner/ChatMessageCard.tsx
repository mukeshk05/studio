
"use client";

import React from 'react'; 
import type { ChatMessage, PreFilteredOptions } from "@/app/(app)/planner/page"; // Import PreFilteredOptions
import type { AITripPlannerInput, AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import type { Itinerary } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CompactItineraryCard } from "./CompactItineraryCard";
import { Bot, User, AlertTriangle, Sparkles, Loader2, Info, Send, MessageSquare, Plane as PlaneIcon, Hotel as HotelIcon, Briefcase, Star } from "lucide-react"; // Added Briefcase, Star
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link"; 

// Function to parse markdown-like links: [Text](URL)
const renderMarkdownLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <Link
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium"
      >
        {match[1]}
      </Link>
    );
    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>);
};


type ChatMessageCardProps = {
  message: ChatMessage;
  onViewDetails: (itinerary: Itinerary) => void;
};

export function ChatMessageCard({ message, onViewDetails }: ChatMessageCardProps) {
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
              <div className={cn(
                "p-2 mb-3 rounded-md text-xs italic",
                "bg-primary/10 text-primary border border-primary/20 flex items-center gap-2"
              )}>
                <Info className="w-4 h-4 shrink-0" />
                <span>{aiOutput.personalizationNote}</span>
              </div>
            )}
            {itineraries.map((itinerary) => (
              <CompactItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                onViewDetails={() => onViewDetails(itinerary)}
              />
            ))}
          </div>
        );
      case "ai_text_response": 
        return <div className="whitespace-pre-line">{renderMarkdownLinks(message.payload as string)}</div>;
      case "error":
        return (
          <div className="flex items-center text-destructive-foreground bg-destructive/80 p-3 rounded-md">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p>{message.payload as string}</p>
          </div>
        );
      case "system":
        return (
          <div className="text-sm text-muted-foreground italic whitespace-pre-line">
            <p>{message.payload as string}</p>
          </div>
        );
      case "loading":
        return (
          <div className="flex items-center text-card-foreground">
            <Sparkles className="w-5 h-5 mr-3 animate-pulse text-primary" />
            <span>{message.payload as string || "BudgetRoam AI is thinking..."}</span>
          </div>
        );
      case "booking_guidance":
        return (
          <Card className={cn("shadow-none border-none p-0 bg-transparent")}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base flex items-center text-card-foreground">
                <Send className="w-4 h-4 mr-2 text-primary" />
                {message.title || "Booking Guidance"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-sm text-card-foreground/90 whitespace-pre-line">
              {renderMarkdownLinks(message.payload as string)}
            </CardContent>
          </Card>
        );
      case "pre_filter_results":
        const preFilterData = message.payload as PreFilteredOptions;
        return (
          <Card className="shadow-none border-none p-0 bg-transparent text-sm">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base flex items-center text-card-foreground">
                <Briefcase className="w-4 h-4 mr-2 text-primary" />
                {message.title || "Pre-filtered Options"}
              </CardTitle>
              {preFilterData.userInput && (
                <CardDescription className="text-xs text-muted-foreground">
                  For: {preFilterData.userInput.destination}, {preFilterData.userInput.travelDates}, Budget: ${preFilterData.userInput.budget.toLocaleString()}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-0 text-card-foreground/90 space-y-3">
              <p className="text-xs italic p-2 bg-primary/5 border border-primary/20 rounded-md">{preFilterData.note}</p>
              {preFilterData.flights.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5 flex items-center"><PlaneIcon className="w-4 h-4 mr-1.5 text-primary" />Filtered Flights ({preFilterData.flights.length}):</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {preFilterData.flights.map((flight, idx) => (
                      <Card key={`pf-flight-${idx}`} className="p-2 text-xs bg-card/70 dark:bg-card/50 border-border/30">
                        <p className="font-medium">{flight.airline} {flight.derived_flight_numbers} - ${flight.price?.toLocaleString()}</p>
                        <p className="text-muted-foreground">{flight.derived_departure_airport_name} to {flight.derived_arrival_airport_name}</p>
                        <p className="text-muted-foreground">{flight.derived_stops_description}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {preFilterData.hotels.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1.5 flex items-center"><HotelIcon className="w-4 h-4 mr-1.5 text-primary" />Filtered Hotels ({preFilterData.hotels.length}):</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {preFilterData.hotels.map((hotel, idx) => (
                      <Card key={`pf-hotel-${idx}`} className="p-2 text-xs bg-card/70 dark:bg-card/50 border-border/30">
                        <p className="font-medium">{hotel.name} - Approx. ${hotel.price_per_night?.toLocaleString()}/night</p>
                        {hotel.rating !== undefined && hotel.rating !== null && <p className="text-muted-foreground">Rating: {hotel.rating} <Star className="w-3 h-3 inline-block text-amber-400 fill-amber-400" /></p>}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {preFilterData.flights.length === 0 && preFilterData.hotels.length === 0 && !preFilterData.note.includes("No flights or hotels found") && (
                  <p className="text-center text-muted-foreground py-3 text-xs">No suitable options found after pre-filtering within budget.</p>
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };
  
  const Icon = isUser ? User : Bot;

  if (message.type === 'system') {
     return (
        <div className="text-center text-sm text-muted-foreground italic py-2 animate-fade-in whitespace-pre-line">
            {message.payload as string}
        </div>
     );
  }

   if (message.type === 'error') {
     return (
        <div className={cn("flex items-start gap-3 animate-fade-in", bubbleAlignment)}>
            {!isUser && ( 
            <Avatar className="w-8 h-8 shrink-0 border-2 border-destructive">
                <AvatarFallback className="bg-destructive text-destructive-foreground"><AlertTriangle /></AvatarFallback>
            </Avatar>
            )}
            <div className={cn("max-w-[85%] sm:max-w-[75%] p-0")}>
                <CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses, "bg-destructive text-destructive-foreground whitespace-pre-line")}>
                 {renderPayload()}
                </CardContent>
                <p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>
                {format(message.timestamp, "p")}
                </p>
            </div>
             {isUser && (
                <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
                   <AvatarFallback className="bg-muted/50"><User /></AvatarFallback>
                </Avatar>
            )}
        </div>
     )
   }

  // Determine Icon based on AI message type for non-user, non-system, non-error messages
  let AiIconComponent = Bot; // Default
  let aiIconClasses = "bg-primary/20 text-primary"; // Default
  if (message.type === 'loading') {
    AiIconComponent = Loader2;
    aiIconClasses = "bg-muted/30 animate-spin";
  } else if (message.type === 'booking_guidance') {
    AiIconComponent = Send;
    aiIconClasses = "bg-accent/20 text-accent";
  } else if (message.type === 'ai_text_response') {
    AiIconComponent = MessageSquare;
    aiIconClasses = "bg-teal-500/20 text-teal-500";
  } else if (message.type === 'pre_filter_results') {
    AiIconComponent = Briefcase;
    aiIconClasses = "bg-blue-500/20 text-blue-500";
  }


  return (
    <div className={cn("flex items-end gap-3 animate-fade-in", bubbleAlignment)}>
      {!isUser && (
        <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
          <AvatarFallback className={cn(aiIconClasses)}>
            <AiIconComponent />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[85%] sm:max-w-[75%] p-0")}> 
        <CardContent className={cn(
            "p-3 rounded-xl text-sm", 
            bubbleClasses, 
            message.type === 'loading' && "py-4", 
            message.type === 'ai_text_response' && "bg-card/80 dark:bg-card/60 border-teal-500/40",
            message.type === 'pre_filter_results' && "bg-card/80 dark:bg-card/60 border-blue-500/40",
            "whitespace-pre-line"
            )}>
          {renderPayload()}
        </CardContent>
        <p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>
          {message.type !== 'loading' ? format(message.timestamp, "p") : (message.payload as string || "Thinking...")}
        </p>
      </div>
      {isUser && (
        <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
           <AvatarFallback className="bg-muted/50"><User /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
