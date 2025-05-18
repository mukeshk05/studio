
"use client";

import type { ChatMessage } from "@/app/(app)/planner/page";
import type { AITripPlannerInput } from "@/ai/flows/ai-trip-planner";
import type { Itinerary } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CardContent } from "@/components/ui/card"; // Only CardContent is needed here
import { CompactItineraryCard } from "./CompactItineraryCard";
import { BotIcon, UserIcon, AlertTriangleIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

type ChatMessageCardProps = {
  message: ChatMessage;
  onViewDetails: (itinerary: Itinerary) => void;
};

export function ChatMessageCard({ message, onViewDetails }: ChatMessageCardProps) {
  const isUser = message.type === "user";
  const bubbleAlignment = isUser ? "justify-end" : "justify-start";
  const bubbleClasses = isUser
    ? "bg-primary text-primary-foreground rounded-br-none shadow-md shadow-primary/30"
    : "bg-card/70 text-card-foreground rounded-bl-none glass-card border-border/50"; // AI uses glass card

  const renderPayload = () => {
    switch (message.type) {
      case "user":
        const input = message.payload as AITripPlannerInput;
        return (
          <div>
            <p><strong>Destination:</strong> {input.destination}</p>
            <p><strong>Dates:</strong> {input.travelDates}</p>
            <p><strong>Budget:</strong> ${input.budget.toLocaleString()}</p>
          </div>
        );
      case "ai":
        const itineraries = message.payload as Itinerary[];
        if (!itineraries || itineraries.length === 0) {
          return <p>No trip options found for your request.</p>;
        }
        return (
          <div className="space-y-3">
            {itineraries.map((itinerary) => (
              <CompactItineraryCard
                key={itinerary.id} // Assuming temp ID is set by parent
                itinerary={itinerary}
                onViewDetails={() => onViewDetails(itinerary)}
              />
            ))}
          </div>
        );
      case "error":
        return (
          <div className="flex items-center text-destructive-foreground bg-destructive/80 p-3 rounded-md">
            <AlertTriangleIcon className="w-5 h-5 mr-2" />
            <p>{message.payload as string}</p>
          </div>
        );
      case "system":
        return (
          <div className="text-sm text-muted-foreground italic">
            <p>{message.payload as string}</p>
          </div>
        );
      case "loading": // This state is now handled by a different UI in parent
        return null; 
      default:
        return null;
    }
  };
  
  const Icon = isUser ? UserIcon : BotIcon;
  // Loading state is now handled differently in the parent (planner/page.tsx)
  if (message.type === 'loading') {
    return null; // Or a very minimal inline loader if absolutely necessary
  }

  if (message.type === 'system') {
     return (
        <div className="text-center text-sm text-muted-foreground italic py-2 animate-fade-in">
            {message.payload as string}
        </div>
     );
  }
   if (message.type === 'error') {
     return (
        <div className={cn("flex items-start gap-3 animate-fade-in", bubbleAlignment)}>
            {!isUser && (
            <Avatar className="w-8 h-8 shrink-0 border-2 border-destructive">
                <AvatarFallback className="bg-destructive text-destructive-foreground"><AlertTriangleIcon /></AvatarFallback>
            </Avatar>
            )}
            <div className={cn("max-w-[75%] p-0")}>
                <CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses, "bg-destructive text-destructive-foreground")}>
                 {renderPayload()}
                </CardContent>
                <p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>
                {format(message.timestamp, "p")}
                </p>
            </div>
            {isUser && ( // User messages don't typically become error bubbles themselves
                <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
                    <AvatarFallback className="bg-muted/50"><UserIcon /></AvatarFallback>
                </Avatar>
            )}
        </div>
     )
   }

  return (
    <div className={cn("flex items-end gap-3 animate-fade-in", bubbleAlignment)}>
      {!isUser && (
        <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
          <AvatarFallback className="bg-primary/20 text-primary"><BotIcon /></AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[85%] sm:max-w-[75%] p-0")}>
        <CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses)}>
          {renderPayload()}
        </CardContent>
        <p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>
          {format(message.timestamp, "p")}
        </p>
      </div>
      {isUser && (
        <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
           <AvatarFallback className="bg-muted/50"><UserIcon /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
