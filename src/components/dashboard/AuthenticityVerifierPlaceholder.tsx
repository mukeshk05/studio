
"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, SearchCheck, Camera, Stamp, ImageOff, Info, UploadCloud, Trash2 } from 'lucide-react';
import { getAuthenticityVerification } from '@/ai/flows/authenticity-verifier-flow';
import type { AuthenticityVerifierInput, AuthenticityVerifierOutput } from '@/ai/types/authenticity-verifier-types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

export function AuthenticityVerifierPlaceholder() { 
  const [itemNameOrDescription, setItemNameOrDescription] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AuthenticityVerifierOutput | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "Image too large", description: "Please upload an image under 5MB.", variant: "destructive" });
        return;
      }
      setUploadedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setVerificationResult(null); 
    }
  };

  const removeUploadedPhoto = () => {
    setUploadedPhoto(null);
    setUploadedPhotoPreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
    }
  };

  const handleVerifyAuthenticity = async () => {
    if (!itemNameOrDescription.trim()) {
      toast({ title: "Input Required", description: "Please enter an item name or description.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);
    try {
      const input: AuthenticityVerifierInput = {
        itemNameOrDescription,
        imageDataUri: uploadedPhotoPreview || undefined,
      };
      const result = await getAuthenticityVerification(input);
      setVerificationResult(result);

      if (!result || !result.verificationSummary) {
         toast({
            title: "No Insights Found",
            description: `Aura Verify couldn't generate specific insights for "${itemNameOrDescription}". Try a more detailed description.`,
            variant: "default"
         });
      }
    } catch (error) {
      console.error("Error verifying authenticity:", error);
      toast({
        title: "AI Error",
        description: "Could not get authenticity insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const imageHint = verificationResult?.generatedImagePrompt || (itemNameOrDescription ? itemNameOrDescription.substring(0,20) : "item type");
  const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

  return (
    <Card className={cn(glassCardClasses, "w-full border-orange-500/30 animate-fade-in-up")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <SearchCheck className="w-6 h-6 mr-2 text-orange-400" />
          AI Authenticity Verifier
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Get conceptual AI insights on local crafts, food, or experiences. (Actual verification requires expertise)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="item-description" className="text-card-foreground/90">Item Name or Description *</Label>
          <Textarea
            id="item-description"
            value={itemNameOrDescription}
            onChange={(e) => setItemNameOrDescription(e.target.value)}
            placeholder="e.g., Handwoven silk scarf from a market in Cusco, Peru or 'Street food taco from a cart in Mexico City'"
            className="mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50 min-h-[70px]"
          />
        </div>

        <div>
          <Label htmlFor="item-photo" className="text-card-foreground/90">Upload Photo (Optional - for context)</Label>
          <div className="mt-1 flex items-center gap-3">
            <Input 
              id="item-photo" 
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
              <Image src={uploadedPhotoPreview} alt="Uploaded item preview" fill className="object-contain" />
            </div>
          )}
        </div>

        <Button
          onClick={handleVerifyAuthenticity}
          disabled={isLoading || !itemNameOrDescription.trim()}
          size="lg"
          className={cn(prominentButtonClasses)}
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Get AI Authenticity Insights (Conceptual)
        </Button>

        {isLoading && !verificationResult && (
          <div className="text-center py-6 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-orange-400" />
            <p>Aura Verify is consulting its knowledge base...</p>
          </div>
        )}

        {verificationResult && !isLoading && (
          <Card className={cn(innerGlassEffectClasses, "mt-4 p-4 animate-fade-in")}>
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-lg text-accent flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Conceptual Authenticity Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3 text-sm">
              {verificationResult.generatedImageUri && (
                <div className="relative aspect-video w-full rounded-md overflow-hidden mb-3 border border-border/30 group shadow-lg">
                  <Image
                    src={verificationResult.generatedImageUri}
                    alt={`Conceptual image for ${itemNameOrDescription}`}
                    fill
                    className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                    data-ai-hint={imageHint}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              {!verificationResult.generatedImageUri && (
                 <div className="aspect-video w-full bg-muted/50 flex items-center justify-center rounded-md mb-3 border border-border/30">
                    <ImageOff className="w-12 h-12 text-muted-foreground" />
                 </div>
              )}

              <div>
                <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Stamp className="w-4 h-4 mr-1.5 text-primary" />AI Verification Summary:</h4>
                <p className="text-muted-foreground pl-6">{verificationResult.verificationSummary}</p>
              </div>
              
              <Separator className="bg-border/40" />

              {verificationResult.authenticityFactors && verificationResult.authenticityFactors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-card-foreground mb-1.5 flex items-center"><SearchCheck className="w-4 h-4 mr-1.5 text-primary" />Key Factors to Consider:</h4>
                  <ul className="list-disc space-y-1 pl-10 text-muted-foreground">
                    {verificationResult.authenticityFactors.map((factor, idx) => <li key={`factor-${idx}`} className="text-xs">{factor}</li>)}
                  </ul>
                </div>
              )}
              
              <Separator className="bg-border/40" />

              <div>
                 <h4 className="font-semibold text-card-foreground mb-1 flex items-center"><Info className="w-4 h-4 mr-1.5 text-primary" />AI Confidence Note:</h4>
                <p className="text-muted-foreground pl-6 italic text-xs">{verificationResult.confidenceNote}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
       <CardFooter className="pt-2">
         <p className="text-xs text-muted-foreground text-center w-full">
            This feature provides conceptual AI-generated insights for illustrative purposes and is not a substitute for expert appraisal.
          </p>
       </CardFooter>
    </Card>
  );
}
