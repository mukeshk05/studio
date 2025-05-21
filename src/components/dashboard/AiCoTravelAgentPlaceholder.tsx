
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2Icon, SparklesIcon, MessageCircleQuestionIcon, LightbulbIcon, SendIcon, InfoIcon } from 'lucide-react';
import { getCoTravelAgentResponse } from '@/ai/flows/co-travel-agent-flow'; // Updated import path
import type { CoTravelAgentInput, CoTravelAgentOutput } from '@/ai/types/co-travel-agent-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function AiCoTravelAgentCard() {
  const [destination, setDestination] = useState('Paris, France'); // Default or pre-fill
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<CoTravelAgentOutput | null>(null);
  const { toast } = useToast();

  const handleAskAura = async () => {
    if (!destination.trim()) {
      toast({ title: "Input Required", description: "Please enter a destination.", variant: "destructive" });
      return;
    }
    if (!question.trim() || question.trim().length < 10) {
      toast({ title: "Input Required", description: "Please enter your question (at least 10 characters).", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setAiResponse(null);
    try {
      const input: CoTravelAgentInput = {
        destination,
        question,
      };
      const result = await getCoTravelAgentResponse(input); // Use the correct function name
      setAiResponse(result);
      if (!result || !result.answer) {
         toast({
            title: "No Answer Found",
            description: `Aura couldn't find a specific answer for your question about "${destination}". Try rephrasing or asking a more general travel question.`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error fetching AI co-travel agent response:", error);
      toast({
        title: "AI Error",
        description: "Could not get a response from Aura AI. Please try again.",
        variant: "destructive",
      });
       setAiResponse({
        answer: "I encountered an issue trying to answer your question. Please check the console for errors or try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(glassCardClasses, "w-full border-teal-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <MessageCircleQuestionIcon className="w-6 h-6 mr-2 text-teal-400" />
          AI Co-Travel Agent (Aura)
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Ask Aura any travel-related question about your destination! (e.g., customs, tipping, local laws, phrases).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="coagent-destination" className="text-card-foreground/90">Destination</Label>
            <Input
              id="coagent-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Rome, Italy"
              className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="coagent-question" className="text-card-foreground/90">Your Question</Label>
          <Textarea
            id="coagent-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What's the best way to get from the airport to the city center? or Is it safe to drink tap water?"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleAskAura}
          disabled={isLoading || !destination.trim() || question.trim().length < 10}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          Ask Aura AI
        </Button>

        {isLoading && !aiResponse && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-teal-400" />
            <p>Aura is thinking...</p>
          </div>
        )}

        {aiResponse && !isLoading && (
          <div className={cn("mt-5 animate-fade-in space-y-3", innerGlassEffectClasses, "p-4 rounded-lg")}>
            <div>
              <h3 className="text-md font-semibold text-card-foreground mb-1 flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-primary" />
                Aura's Answer:
              </h3>
              <ScrollArea className="max-h-48">
                 <p className="text-sm text-card-foreground/90 whitespace-pre-line leading-relaxed pr-3">{aiResponse.answer}</p>
              </ScrollArea>
            </div>

            {aiResponse.relevantTips && aiResponse.relevantTips.length > 0 && (
              <div>
                <Separator className="my-2 bg-border/40" />
                <h4 className="text-sm font-semibold text-card-foreground mb-1 flex items-center">
                  <LightbulbIcon className="w-4 h-4 mr-1.5 text-accent" />
                  Relevant Tips from Aura:
                </h4>
                <ul className="list-disc list-inside space-y-1 pl-3">
                  {aiResponse.relevantTips.map((tip, index) => (
                    <li key={index} className="text-xs text-muted-foreground">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
            <InfoIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            Aura AI provides information based on its training. Always verify critical details.
          </p>
       </CardFooter>
    </Card>
  );
}
