

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, AlertTriangle, ShieldAlert, Info, ExternalLink, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

interface MockAIResponse {
  scenario: string;
  impact: string[];
  adjustments: string[];
  additionalNotes?: string;
}

export function AiRiskScenarioSimulatorCard() {
  const [tripContext, setTripContext] = useState("My 7-day trip to Rome and Florence, with pre-booked train Rome-Florence on Day 3, and Colosseum tour on Day 2.");
  const [riskScenario, setRiskScenario] = useState("What if my flight to Rome (Day 1 arrival) is delayed by 8 hours?");
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<MockAIResponse | null>(null);

  const handleSimulate = () => {
    if (!tripContext.trim() || !riskScenario.trim()) {
      // Basic validation, can be enhanced
      alert("Please provide both trip context and a risk scenario.");
      return;
    }
    setIsLoading(true);
    setAiResponse(null);

    // Simulate AI processing
    setTimeout(() => {
      let mockResponse: MockAIResponse;
      if (riskScenario.toLowerCase().includes("flight delayed")) {
        mockResponse = {
          scenario: riskScenario,
          impact: [
            "Likely miss first night's hotel check-in window in Rome.",
            "May miss pre-booked Colosseum tour on Day 2 if arrival is very late.",
            "Train to Florence on Day 3 might be unaffected if delay is managed.",
          ],
          adjustments: [
            "Contact Rome hotel immediately to inform of late arrival and confirm check-in procedure.",
            "Check Colosseum tour cancellation/reschedule policy. Contact provider if necessary.",
            "If Day 2 morning activities are impacted, consider moving a less time-sensitive Rome activity to Day 2 afternoon.",
            "Verify airport transfer options available at the new estimated arrival time."
          ],
          additionalNotes: "Aura AI would also help you find contact numbers for your hotel and tour provider, and show alternative local activities if needed."
        };
      } else if (riskScenario.toLowerCase().includes("rain")) {
         mockResponse = {
          scenario: riskScenario,
          impact: [
            "Outdoor activities like visiting the Roman Forum or Palatine Hill will be uncomfortable.",
            "Walking between sites will be less pleasant.",
          ],
          adjustments: [
            "Prioritize indoor museums (e.g., Vatican Museums, Borghese Gallery - check booking).",
            "Consider a scenic bus tour or a cooking class for the rainy day.",
            "Pack an umbrella and waterproof jacket if not already included.",
            "Look for cozy cafes or indoor markets to explore."
          ],
          additionalNotes: "Aura AI can suggest specific indoor attractions with good reviews and current availability."
        };
      } else {
        mockResponse = {
            scenario: riskScenario,
            impact: ["The AI needs more specific training for this exact scenario type."],
            adjustments: [
                "Check official travel advisories for your destination.",
                "Contact your airline/hotel for their policies regarding your situation.",
                "Have travel insurance details handy."
            ],
            additionalNotes: "For complex or uncommon scenarios, Aura AI aims to provide general guidance and resource links."
        };
      }
      setAiResponse(mockResponse);
      setIsLoading(false);
    }, 1500);
  };
  
  const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <Card className={cn(glassCardClasses, "w-full border-red-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <ShieldAlert className="w-6 h-6 mr-2 text-red-400" />
          AI Travel Risk Scenario Simulator
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          (Conceptual Demo) Explore how Aura AI could help you adapt to unexpected travel disruptions by simulating responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="trip-context" className="text-card-foreground/90">Your Trip Context</Label>
          <Textarea
            id="trip-context"
            value={tripContext}
            onChange={(e) => setTripContext(e.target.value)}
            placeholder="e.g., My 5-day trip to Paris, staying near Eiffel Tower. Booked Louvre for Day 2."
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[70px]"
          />
        </div>
        <div>
          <Label htmlFor="risk-scenario" className="text-card-foreground/90">"What if..." Risk Scenario</Label>
          <Input
            id="risk-scenario"
            value={riskScenario}
            onChange={(e) => setRiskScenario(e.target.value)}
            placeholder="e.g., ...my flight is cancelled due to weather? or ...I lose my passport?"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
          />
        </div>

        <Button
          onClick={handleSimulate}
          disabled={isLoading || !tripContext.trim() || !riskScenario.trim()}
          size="lg"
          className={prominentButtonClasses}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Simulate AI Response
        </Button>

        {isLoading && !aiResponse && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-red-400" />
            <p>Aura AI is simulating the scenario and preparing adaptive strategies...</p>
          </div>
        )}

        {aiResponse && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg text-accent flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                AI Simulated Response for:
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground italic pl-7">
                "{aiResponse.scenario}"
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Sparkles className="w-4 h-4 mr-1.5 text-primary" />Potential Impact:</h4>
                <ul className="list-disc space-y-0.5 pl-10 text-muted-foreground">
                  {aiResponse.impact.map((item, idx) => <li key={`impact-${idx}`}>{item}</li>)}
                </ul>
              </div>
              
              <Separator className="bg-border/40" />

              <div>
                <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><ShieldAlert className="w-4 h-4 mr-1.5 text-primary" />Aura AI's Suggested Adjustments:</h4>
                <ul className="list-disc space-y-0.5 pl-10 text-muted-foreground">
                  {aiResponse.adjustments.map((item, idx) => <li key={`adj-${idx}`}>{item}</li>)}
                </ul>
              </div>

              {aiResponse.additionalNotes && (
                <div className="pt-2 mt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground italic flex items-start">
                    <Info className="w-3.5 h-3.5 mr-1.5 mt-0.5 shrink-0 text-primary" />
                    {aiResponse.additionalNotes}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-4 px-0 pb-0">
               <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="outline" size="sm" className="w-full glass-interactive border-primary/50 text-primary hover:bg-primary/10" disabled>
                        <Save className="w-4 h-4 mr-1.5" /> Save Scenario Analysis
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent className="glass-card">
                      <p>Future feature: Save this analysis to your trip notes.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            </CardFooter>
          </Card>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full">
           This is a conceptual demonstration. Real-time dynamic replanning and API integrations are future features.
          </p>
       </CardFooter>
    </Card>
  );
}
