
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircleQuestionIcon, Wand2Icon, LightbulbIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function AiCoTravelAgentPlaceholder() {
  return (
    <Card className={cn("glass-card border-teal-500/30", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <Wand2Icon className="w-6 h-6 mr-2 text-teal-400" />
            AI Co-Travel Agent
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          "Should I carry cash in Tokyo?" — Get instant, context-aware answers from your AI travel companion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI travel assistant providing contextual information"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ai travel assistant chat help"
            />
          </div>
          <p>
            Imagine asking any travel-related question – customs, tipping, local laws, power adapters, essential phrases – and getting intelligent, context-aware answers. Your AI Co-Travel Agent could even provide dynamic checklists and insights during your trip based on your location and itinerary.
          </p>
          <div className="flex items-center justify-center py-2 gap-2">
            <MessageCircleQuestionIcon className="w-8 h-8 text-teal-400/50 animate-pulse" />
            <LightbulbIcon className="w-7 h-7 text-primary/40 absolute animate-ping" style={{ animationDuration: '3s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Your personal travel expert, available 24/7.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
