
"use client";

import type { ChatMessage } from "@/app/(app)/planner/page";
import type { AITripPlannerInput } from "@/ai/flows/ai-trip-planner";
import type { Itinerary } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { CompactItineraryCard } from "./CompactItineraryCard";
import { BotIcon, UserIcon, AlertTriangleIcon, SparklesIcon, Loader2Icon } from "lucide-react";
import { format } from 'date-fns';

type ChatMessageCardProps = {
  message: ChatMessage;
  onViewDetails: (itinerary: Itinerary) => void;
};

export function ChatMessageCard({ message, onViewDetails }: ChatMessageCardProps) {
  const isUser = message.type === "user";
  const bubbleAlignment = isUser ? "justify-end" : "justify-start";
  const bubbleClasses = isUser
    ? "bg-primary text-primary-foreground rounded-br-none"
    : "bg-muted text-foreground rounded-bl-none";

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
                key={itinerary.id}
                itinerary={itinerary}
                onViewDetails={() => onViewDetails(itinerary)}
              />
            ))}
          </div>
        );
      case "error":
        return (
          <div className="flex items-center text-destructive-foreground bg-destructive p-3 rounded-md">
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
      case "loading":
        return (
          <div className="flex items-center justify-center p-4 text-primary">
            <Loader2Icon className="w-6 h-6 animate-spin mr-3" />
            <span>BudgetRoam AI is crafting your journey...</span>
          </div>
        );
      default:
        return null;
    }
  };
  
  const Icon = isUser ? UserIcon : BotIcon;
  if (message.type === 'loading') {
    return (
         <div className="flex justify-center items-center p-4 animate-fade-in">
            <Card className="bg-card/60 dark:bg-card/40 backdrop-blur-lg border-none shadow-xl p-6 w-full max-w-md text-center">
                 <SparklesIcon className="w-10 h-10 text-primary mx-auto mb-3 animate-pulse" />
                 <p className="text-foreground/90">BudgetRoam AI is crafting your journey...</p>
                 <p className="text-xs text-muted-foreground">This may take a few moments.</p>
            </Card>
        </div>
    );
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
        <div className={`flex items-start gap-3 animate-fade-in ${bubbleAlignment}`}>
            {!isUser && (
            <Avatar className="w-8 h-8 shrink-0 border-2 border-destructive">
                <AvatarFallback className="bg-destructive text-destructive-foreground"><AlertTriangleIcon /></AvatarFallback>
            </Avatar>
            )}
            <div className={`max-w-[75%] p-0`}>
                <CardContent className={`p-3 rounded-xl shadow-md text-sm ${bubbleClasses} ${isUser ? 'bg-destructive text-destructive-foreground' : 'bg-destructive text-destructive-foreground'}`}>
                 {renderPayload()}
                </CardContent>
                <p className={`text-xs text-muted-foreground mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                {format(message.timestamp, "p")}
                </p>
            </div>
            {isUser && ( // Error messages are from system, but if user caused an error, it's not shown this way
                <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback><UserIcon /></AvatarFallback>
                </Avatar>
            )}
        </div>
     )
   }


  return (
    <div className={`flex items-end gap-3 animate-fade-in ${bubbleAlignment}`}>
      {!isUser && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground"><BotIcon /></AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[85%] sm:max-w-[75%] p-0`}>
        <CardContent className={`p-3 rounded-xl shadow-md text-sm ${bubbleClasses}`}>
          {renderPayload()}
        </CardContent>
        <p className={`text-xs text-muted-foreground mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {format(message.timestamp, "p")}
        </p>
      </div>
      {isUser && (
        <Avatar className="w-8 h-8 shrink-0">
           <AvatarFallback><UserIcon /></AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
