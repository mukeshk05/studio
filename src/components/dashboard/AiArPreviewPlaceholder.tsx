
"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Camera, UploadCloud, Eye, ImageOff, Info, Tag, Clock, Trash2 } from 'lucide-react';
import { getAiArPreview } from '@/ai/flows/ai-ar-preview-flow';
import type { AiArPreviewInput, AiArPreviewOutput } from '@/ai/types/ai-ar-preview-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function AiArPreviewPlaceholder() { 
  const [landmarkName, setLandmarkName] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [arPreviewData, setArPreviewData] = useState<AiArPreviewOutput | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setArPreviewData(null); // Clear previous results if new photo is uploaded
    }
  };

  const removeUploadedPhoto = () => {
    setUploadedPhoto(null);
    setUploadedPhotoPreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleFetchArPreview = async () => {
    if (!landmarkName.trim()) {
      toast({ title: "Input Required", description: "Please enter a landmark name.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setArPreviewData(null);
    try {
      let photoDataUri: string | undefined = undefined;
      if (uploadedPhoto && uploadedPhotoPreview) {
        photoDataUri = uploadedPhotoPreview; // Use the base64 preview as data URI
      }

      const input: AiArPreviewInput = {
        landmarkName,
        photoDataUri: photoDataUri,
      };
      const result = await getAiArPreview(input);
      setArPreviewData(result);

      if (!result || !result.sceneDescription) {
         toast({
            title: "No Insights Found",
            description: `Aura AR couldn't generate specific insights for "${landmarkName}". Try a well-known landmark or ensure your image (if uploaded) is clear.`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error fetching AI AR preview:", error);
      toast({
        title: "AI Error",
        description: "Could not get AR preview insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const displayImageUri = uploadedPhotoPreview || arPreviewData?.generatedImageUri;
  const imageAltText = uploadedPhotoPreview ? `User uploaded photo of ${landmarkName}` : `AI generated image for ${landmarkName}`;
  const imageHint = displayImageUri?.startsWith('https://placehold.co') ? (arPreviewData?.generatedImagePrompt || landmarkName) : undefined;

  const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <Card className={cn(glassCardClasses, "w-full border-pink-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <span className="relative mr-2">
            <Camera className="w-6 h-6 text-pink-400" />
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 absolute -top-1 -right-1 opacity-90" />
          </span>
          AI + AR Live Preview Insights
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Get AI-powered insights as if you're viewing a landmark through AR right now! (Actual AR rendering is simulated)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ar-landmark" className="text-card-foreground/90">Landmark Name *</Label>
          <Input
            id="ar-landmark"
            value={landmarkName}
            onChange={(e) => setLandmarkName(e.target.value)}
            placeholder="e.g., Eiffel Tower, Times Square, Taj Mahal"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"
          />
        </div>

        <div>
          <Label htmlFor="ar-photo" className="text-card-foreground/90">Upload Photo (Optional - for context)</Label>
          <div className="mt-1 flex items-center gap-3">
            <Input 
              id="ar-photo" 
              type="file" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
              ref={fileInputRef}
              className="file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 flex-grow" 
            />
            {uploadedPhotoPreview && (
              <Button variant="ghost" size="icon" onClick={removeUploadedPhoto} className="text-destructive hover:bg-destructive/10 h-9 w-9">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          {uploadedPhotoPreview && (
            <div className="mt-2 relative w-full max-w-xs h-auto aspect-video rounded-md overflow-hidden border border-border/50 shadow-sm">
              <Image src={uploadedPhotoPreview} alt="Uploaded photo preview" fill className="object-contain" />
            </div>
          )}
        </div>

        <Button
          onClick={handleFetchArPreview}
          disabled={isLoading || !landmarkName.trim()}
          size="lg"
          className={cn(prominentButtonClasses)}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Eye />}
          Get Live AR Insights (Simulated)
        </Button>

        {isLoading && !arPreviewData && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-pink-400" />
            <p>Aura Lens is analyzing the scene in real-time...</p>
          </div>
        )}

        {arPreviewData && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg text-accent flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Simulated AR Insights for {landmarkName}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {displayImageUri && (
                <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
                  <Image
                    src={displayImageUri}
                    alt={imageAltText}
                    fill
                    className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                    data-ai-hint={imageHint}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              {!displayImageUri && (
                 <div className="aspect-video w-full bg-muted/50 flex items-center justify-center rounded-md mb-3 border border-border/30">
                    <ImageOff className="w-12 h-12 text-muted-foreground" />
                 </div>
              )}

              <div>
                <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Info className="w-4 h-4 mr-1.5 text-primary" />Scene Description (Now):</h4>
                <p className="text-sm text-muted-foreground pl-6">{arPreviewData.sceneDescription}</p>
              </div>
              
              <Separator className="bg-border/40" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><Tag className="w-4 h-4 mr-1.5 text-primary" />Current Mood:</h4>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                        {arPreviewData.moodTags.map((tag, idx) => <Badge key={`mood-${idx}`} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{tag}</Badge>)}
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><Tag className="w-4 h-4 mr-1.5 text-primary" />Suggested Activities (Now):</h4>
                    <div className="flex flex-wrap gap-1.5 pl-6">
                        {arPreviewData.activityTags.map((tag, idx) => <Badge key={`activity-${idx}`} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{tag}</Badge>)}
                    </div>
                </div>
              </div>

              {arPreviewData.optimalPhotoTime && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Clock className="w-4 h-4 mr-1.5 text-primary" />Optimal Photo Time:</h4>
                  <p className="text-sm text-muted-foreground pl-6">{arPreviewData.optimalPhotoTime}</p>
                </div>
              )}
               {arPreviewData.generatedImagePrompt && (
                  <p className="text-xs italic text-muted-foreground/70 pl-6">(AI used image prompt: "{arPreviewData.generatedImagePrompt}")</p>
                )}
            </CardContent>
          </Card>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full">
            This feature simulates AI-driven AR insights using live AI calls for text & image generation. Actual AR overlay is conceptual.
          </p>
       </CardFooter>
    </Card>
  );
}
