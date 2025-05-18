
"use client";

import type { ChatMessage } from "@/app/(app)/planner/page";
import type { AITripPlannerInput, AITripPlannerOutput } from "@/ai/types/trip-planner-types";
import type { Itinerary } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added Card, CardHeader, CardTitle
import { CompactItineraryCard } from "./CompactItineraryCard";
import { BotIcon, UserIcon, AlertTriangleIcon, SparklesIcon, Loader2Icon, InfoIcon, SendIcon } from "lucide-react"; // Added SendIcon
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import Link from "next/link"; // Added Link for markdown-like links

// Function to parse markdown-like links: [Text](URL)
const renderMarkdownLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add the link
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

  // Add any remaining text after the last link
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
        const input = message.payload as AITripPlannerInput;
        return (
          <div>
            <p><strong>Destination:</strong> {input.destination}</p>
            <p><strong>Dates:</strong> {input.travelDates}</p>
            <p><strong>Budget:</strong> ${input.budget.toLocaleString()}</p>
            {input.desiredMood && <p><strong>Mood:</strong> {input.desiredMood}</p>}
          </div>
        );
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
                <InfoIcon className="w-4 h-4 shrink-0" />
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
      case "error":
        return (
          <div className="flex items-center text-destructive-foreground bg-destructive/80 p-3 rounded-md">
            <AlertTriangleIcon className="w-5 h-5 mr-2" />
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
            <SparklesIcon className="w-5 h-5 mr-3 animate-pulse text-primary" />
            <span>BudgetRoam AI is crafting your journey...</span>
          </div>
        );
      case "booking_guidance":
        return (
          <Card className={cn("shadow-none border-none p-0 bg-transparent")}>
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-base flex items-center text-card-foreground">
                <SendIcon className="w-4 h-4 mr-2 text-primary" />
                {message.title || "Booking Guidance"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-sm text-card-foreground/90 whitespace-pre-line">
              {renderMarkdownLinks(message.payload as string)}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };
  
  const Icon = isUser ? UserIcon : BotIcon;

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
                <AvatarFallback className="bg-destructive text-destructive-foreground"><AlertTriangleIcon /></AvatarFallback>
            </Avatar>
            )}
            <div className={cn("max-w-[75%] p-0")}>
                <CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses, "bg-destructive text-destructive-foreground whitespace-pre-line")}>
                 {renderPayload()}
                </CardContent>
                <p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>
                {format(message.timestamp, "p")}
                </p>
            </div>
        </div>
     )
   }

  return (
    <div className={cn("flex items-end gap-3 animate-fade-in", bubbleAlignment)}>
      {!isUser && (
        <Avatar className="w-8 h-8 shrink-0 border border-primary/50">
          <AvatarFallback className={cn("bg-primary/20 text-primary", message.type === 'loading' && "bg-muted/30", message.type === 'booking_guidance' && "bg-accent/20 text-accent")}>
            {message.type === 'loading' ? <Loader2Icon className="animate-spin" /> : 
             message.type === 'booking_guidance' ? <SendIcon /> : <BotIcon />}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("max-w-[85%] sm:max-w-[75%] p-0")}>
        <CardContent className={cn("p-3 rounded-xl text-sm", bubbleClasses, message.type === 'loading' && "py-4", "whitespace-pre-line")}>
          {renderPayload()}
        </CardContent>
        <p className={cn("text-xs text-muted-foreground mt-1 px-1", isUser ? 'text-right' : 'text-left')}>
          {message.type !== 'loading' ? format(message.timestamp, "p") : "Thinking..."}
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

