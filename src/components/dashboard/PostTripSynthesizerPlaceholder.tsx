
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2Icon, SparklesIcon, LayersIcon, RouteIcon, LightbulbIcon, InfoIcon, FileImageIcon, ImageOffIcon, ExternalLinkIcon } from 'lucide-react';
import { synthesizePostTripFeedback } from '@/ai/flows/post-trip-synthesizer-flow';
import type { PostTripFeedbackInput, PostTripAnalysisOutput, FutureTrajectorySuggestion } from '@/ai/types/post-trip-synthesizer-types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { AITripPlannerInput } from '@/ai/types/trip-planner-types';
import { useRouter } from 'next/navigation';


const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

// Mock a recently completed trip for demo purposes
const sampleCompletedTrip = {
  destination: "Kyoto, Japan",
  travelDates: "Last Spring (April 10-17, 2024)",
  styleOrSummary: "Cultural immersion and cherry blossom viewing",
};

function TrajectorySuggestionCard({ suggestion, onPlanNextTrip }: { suggestion: FutureTrajectorySuggestion, onPlanNextTrip: (tripIdea: AITripPlannerInput) => void }) {
  const imageHint = suggestion.imagePrompt || suggestion.trajectoryName.toLowerCase().split(" ").slice(0,2).join(" ");
  return (
    <Card className={cn(glassCardClasses, "border-accent/30 overflow-hidden transform hover:scale-[1.01] transition-transform duration-200")}>
       {/* Conceptual Image - In a real app, you'd generate this with AI or have curated images */}
      <div className="relative aspect-video w-full bg-muted/30 group">
         <Image src={`https://placehold.co/600x400.png?text=${encodeURIComponent(imageHint)}`} alt={suggestion.trajectoryName} fill className="object-cover group-hover:scale-105 transition-transform" data-ai-hint={imageHint} />
      </div>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-md font-semibold text-accent flex items-center">
          <RouteIcon className="w-5 h-5 mr-2" />
          {suggestion.trajectoryName}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2 text-muted-foreground">
        <p>{suggestion.description}</p>
        {suggestion.exampleDestinations && suggestion.exampleDestinations.length > 0 && (
          <div>
            <h4 className="font-medium text-card-foreground text-xs">Example Destinations:</h4>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {suggestion.exampleDestinations.map(dest => (
                <Badge key={dest} variant="secondary" className="bg-accent/10 text-accent border-accent/20 text-xs">{dest}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      {suggestion.nextStepTripIdea && (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            className="w-full glass-interactive text-accent hover:bg-accent/20 hover:text-accent-foreground"
            onClick={() => onPlanNextTrip(suggestion.nextStepTripIdea!)}
          >
            <ExternalLinkIcon className="w-4 h-4 mr-2" /> Plan a trip on this path
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}


export function PostTripSynthesizerCard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [lovedMost, setLovedMost] = useState('');
  const [surprises, setSurprises] = useState('');
  const [feelings, setFeelings] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PostTripAnalysisOutput | null>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image too large", description: "Please upload an image under 5MB.", variant: "destructive" });
        return;
      }
      setUploadedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSynthesize = async () => {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    if (!lovedMost) {
        toast({ title: "Feedback Needed", description: "Please tell us what you loved most about your trip.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const input: PostTripFeedbackInput = {
        userId: currentUser.uid,
        tripDestination: sampleCompletedTrip.destination,
        tripTravelDates: sampleCompletedTrip.travelDates,
        tripStyleOrSummary: sampleCompletedTrip.styleOrSummary,
        feedbackLovedMost: lovedMost,
        feedbackSurprises: surprises || undefined,
        feedbackFeelings: feelings || undefined,
        feedbackKeyTakeaways: keyTakeaways || undefined,
        uploadedPhotoName: uploadedPhoto?.name || undefined,
      };
      const result = await synthesizePostTripFeedback(input);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Error synthesizing post-trip feedback:", error);
      toast({ title: "AI Error", description: "Could not synthesize feedback. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePlanNextTrajectoryTrip = (tripIdea: AITripPlannerInput) => {
    localStorage.setItem('tripBundleToPlan', JSON.stringify(tripIdea));
    window.dispatchEvent(new CustomEvent('localStorageUpdated_tripBundleToPlan')); // For potential listeners
    router.push('/planner');
  };

  return (
    <Card className={cn(glassCardClasses, "w-full border-emerald-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <LayersIcon className="w-6 h-6 mr-2 text-emerald-400" />
          AI Post-Trip Synthesizer & Trajectory Mapper
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Reflect on your travels ({sampleCompletedTrip.destination}) and let Aura AI map your future adventures based on your experiences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={cn("p-3 rounded-md", innerGlassEffectClasses)}>
          <h4 className="text-sm font-medium text-card-foreground mb-1">Reflecting on: <span className="text-primary">{sampleCompletedTrip.destination}</span></h4>
          <p className="text-xs text-muted-foreground">Travel Dates: {sampleCompletedTrip.travelDates}</p>
          <p className="text-xs text-muted-foreground">Style: {sampleCompletedTrip.styleOrSummary}</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="lovedMost" className="text-sm font-medium text-card-foreground/90">What were the highlights / What did you love most? *</Label>
            <Textarea id="lovedMost" value={lovedMost} onChange={(e) => setLovedMost(e.target.value)} placeholder="e.g., The amazing food, discovering hidden temples, the friendly locals..." className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[70px]" />
          </div>
          <div>
            <Label htmlFor="surprises" className="text-sm font-medium text-card-foreground/90">What surprised you or was unexpected? (Optional)</Label>
            <Textarea id="surprises" value={surprises} onChange={(e) => setSurprises(e.target.value)} placeholder="e.g., How easy it was to get around, the beautiful sunsets..." className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[50px]" />
          </div>
          <div>
            <Label htmlFor="feelings" className="text-sm font-medium text-card-foreground/90">How did this trip make you feel overall? (Optional)</Label>
            <Textarea id="feelings" value={feelings} onChange={(e) => setFeelings(e.target.value)} placeholder="e.g., Relaxed and rejuvenated, inspired and adventurous, culturally enriched..." className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[50px]" />
          </div>
          <div>
            <Label htmlFor="keyTakeaways" className="text-sm font-medium text-card-foreground/90">Any key takeaways or new interests sparked? (Optional)</Label>
            <Textarea id="keyTakeaways" value={keyTakeaways} onChange={(e) => setKeyTakeaways(e.target.value)} placeholder="e.g., I want to learn more about local pottery, I'd love to try more street food..." className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[50px]" />
          </div>
          
          {/* Conceptual Photo Upload */}
          <div>
            <Label htmlFor="tripPhoto" className="text-sm font-medium text-card-foreground/90">Share a favorite photo (Optional, conceptual)</Label>
            <Input id="tripPhoto" type="file" accept="image/*" onChange={handlePhotoUpload} className="mt-1 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
            {uploadedPhotoPreview && (
              <div className="mt-2 relative w-32 h-32 rounded-md overflow-hidden border border-border/50 shadow-sm">
                <Image src={uploadedPhotoPreview} alt="Uploaded photo preview" fill className="object-cover" />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">AI won't analyze image content yet, but this helps simulate full feedback.</p>
          </div>
        </div>

        <Button
          onClick={handleSynthesize}
          disabled={isLoading || !currentUser || !lovedMost}
          size="lg"
          className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
          Analyze Trip & Map Future Trajectories
        </Button>

        {isLoading && !analysisResult && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2Icon className="w-10 h-10 animate-spin mx-auto mb-3 text-emerald-400" />
            <p>Aura AI is synthesizing your journey and predicting future paths...</p>
          </div>
        )}

        {analysisResult && !isLoading && (
          <div className="mt-6 space-y-5">
            <Separator className="bg-emerald-500/30" />
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2 flex items-center"><LightbulbIcon className="w-5 h-5 mr-2 text-primary" />AI Insights: Your Evolving Travel DNA</h3>
              <div className={cn("p-3 rounded-md text-sm italic", innerGlassEffectClasses)}>
                  <InfoIcon className="w-4 h-4 mr-1.5 text-primary float-left mt-0.5" />
                  {analysisResult.refinedPersonaInsights}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Future Travel Trajectory Suggestions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.futureTrajectorySuggestions.map((suggestion, index) => (
                  <TrajectorySuggestionCard key={index} suggestion={suggestion} onPlanNextTrip={handlePlanNextTrajectoryTrip} />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full">
            This tool helps you discover deeper travel preferences. Full integration with your trip history coming soon!
          </p>
       </CardFooter>
    </Card>
  );
}
