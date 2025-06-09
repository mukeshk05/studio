
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureShowcaseCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  dataAiHint?: string; // For potential future image generation based on card content
}

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";

export function FeatureShowcaseCard({ icon, title, description, link, dataAiHint }: FeatureShowcaseCardProps) {
  return (
    <Card className={cn(glassCardClasses, "flex flex-col h-full overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30")} data-ai-hint={dataAiHint}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center text-primary mb-2">
          {React.cloneElement(icon as React.ReactElement, { className: "w-8 h-8" })}
        </div>
        <CardTitle className="text-lg font-semibold text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground flex-grow">
        <p className="line-clamp-3">{description}</p>
      </CardContent>
      <CardFooter className="pt-3">
        <Button asChild variant="outline" size="sm" className="w-full glass-interactive text-primary hover:bg-primary/10 hover:text-primary-foreground">
          <Link href={link}>
            Learn More <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
