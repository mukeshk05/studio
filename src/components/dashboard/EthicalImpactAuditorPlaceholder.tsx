
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheckIcon, LeafIcon, CheckCircleIcon, ScaleIcon, UsersIcon, HandHeartIcon, CircleDollarSignIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function EthicalImpactAuditorPlaceholder() {
  return (
    <Card className={cn("glass-card border-green-600/30 hover:border-green-500/50 transition-all", "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <span className="relative mr-2">
              <ShieldCheckIcon className="w-6 h-6 text-green-500" />
              <LeafIcon className="w-3.5 h-3.5 text-green-700 absolute -bottom-1 -right-1 opacity-90" />
            </span>
            AI Ethical & Sustainable Impact Auditor
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground whitespace-nowrap" disabled>
            (Future Vision)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Go beyond simple eco-labels. AI will perform a deep ethical and sustainability audit of your itinerary, offering vetted alternatives for truly responsible travel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-card-foreground/90 space-y-3">
          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group">
            <Image
                src="https://placehold.co/600x400.png"
                alt="Conceptual AI interface for ethical and sustainable travel audit"
                fill
                className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                data-ai-hint="ethical sustainable travel audit"
            />
          </div>
          <p>
            Imagine submitting your trip plan, and Aura AI analyzes each component – from accommodations to tours and dining. It would assess:
          </p>
          <ul className="list-none space-y-1.5 pl-2 text-xs text-muted-foreground">
            <li className="flex items-start"><CircleDollarSignIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-green-500" /> Fair wages & local employment practices.</li>
            <li className="flex items-start"><HandHeartIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-green-500" /> Animal welfare standards for any wildlife interactions.</li>
            <li className="flex items-start"><UsersIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-green-500" /> Impact on over-tourism and local communities.</li>
            <li className="flex items-start"><LeafIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-green-500" /> Environmental footprint (e.g., plastic use, energy sources).</li>
            <li className="flex items-start"><InfoIcon className="w-3.5 h-3.5 mr-2 mt-0.5 shrink-0 text-green-500" /> Genuine community support and cultural preservation.</li>
          </ul>
          <p className="mt-2">
            Crucially, if parts of your plan score lower, Aura AI would suggest specific, <span className="font-semibold text-green-500">vetted, comparable alternatives</span> that meet higher ethical and sustainability standards, allowing you to make informed and impactful choices.
          </p>
          <div className="flex items-center justify-center py-2 gap-3 mt-3">
            <ScaleIcon className="w-7 h-7 text-green-500/50 animate-pulse" />
            <CheckCircleIcon className="w-8 h-8 text-primary/40 absolute animate-ping" style={{ animationDuration: '3.2s' }}/>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Travel responsibly, empowered by AI insights.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
