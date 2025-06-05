
"use client";

import React from 'react';
import type { LocalInsiderTipsOutput } from '@/ai/flows/local-insider-tips-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Lightbulb, MapPin, Search, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocalInsiderTipsDisplayProps {
  tipsData: LocalInsiderTipsOutput;
  destinationName?: string;
}

const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-lg";

export function LocalInsiderTipsDisplay({ tipsData, destinationName }: LocalInsiderTipsDisplayProps) {
  return (
    <Card className={cn(innerGlassEffectClasses, "w-full shadow-lg border-accent/20")}>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-lg font-semibold text-accent flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          Local Insider Scoop{destinationName ? ` for ${destinationName}` : ""}
        </CardTitle>
        <p className="text-xs text-muted-foreground">AI-simulated real-time insights for today!</p>
      </CardHeader>
      <CardContent className="text-sm space-y-4">
        <div>
          <h4 className="font-medium text-card-foreground mb-1 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-primary" />
            Trending Spots Summary:
          </h4>
          <p className="text-xs text-muted-foreground pl-6 italic">{tipsData.trendingSpotsSummary}</p>
        </div>
        <Separator className="bg-border/30" />
        <div>
          <h4 className="font-medium text-card-foreground mb-1 flex items-center">
            <Search className="w-4 h-4 mr-2 text-primary" />
            Hidden Gem Pick: <span className="font-semibold ml-1 text-primary/90">{tipsData.hiddenGemPick.name}</span>
          </h4>
          <p className="text-xs text-muted-foreground pl-6">{tipsData.hiddenGemPick.description}</p>
          <p className="text-xs text-muted-foreground pl-6 mt-0.5"><strong className="text-card-foreground/80">Why it fits:</strong> {tipsData.hiddenGemPick.reason}</p>
        </div>
        <Separator className="bg-border/30" />
        <div>
          <h4 className="font-medium text-card-foreground mb-1 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2 text-primary" />
            Daily Activity Pick: <span className="font-semibold ml-1 text-primary/90">{tipsData.dailyActivityPick.name}</span>
          </h4>
          <p className="text-xs text-muted-foreground pl-6">{tipsData.dailyActivityPick.description}</p>
          <p className="text-xs text-muted-foreground pl-6 mt-0.5"><strong className="text-card-foreground/80">Why it fits:</strong> {tipsData.dailyActivityPick.reason}</p>
        </div>
        <Separator className="bg-border/30" />
        <div>
          <h4 className="font-medium text-card-foreground mb-1 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            General Availability Notes:
          </h4>
          <p className="text-xs text-muted-foreground pl-6 italic">{tipsData.availabilityNotes}</p>
        </div>
      </CardContent>
    </Card>
  );
}
