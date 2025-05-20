
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2Icon, ScanSearchIcon, UploadCloudIcon, ImageIcon, SearchCheckIcon, AlertTriangleIcon, SparklesIcon, HotelIcon, PlaneIcon, Trash2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  type: 'hotel' | 'flight_details' | 'generic' | 'error';
  name?: string;
  similarity?: string;
  image_url?: string;
  airline?: string;
  route?: string;
  price?: string;
  message?: string;
}

export function VisualSearchPlaceholder() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const conceptualBackendUrl = 'http://localhost:5001/api/analyze-image'; // Defined for clarity

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Image Too Large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a JPG, PNG, or WEBP image.",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setAnalysisResults(null); // Clear previous results
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageFile || !uploadedImage) {
      toast({
        title: "No Image",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setAnalysisResults(null);
    
    try {
      const response = await fetch(conceptualBackendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data_url: uploadedImage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error from server or server not running." }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      
      if (data.analysis_results && data.analysis_results.length > 0) {
        setAnalysisResults(data.analysis_results);
        toast({
          title: "Analysis Complete",
          description: data.message || "AI has analyzed the image.",
        });
      } else {
         setAnalysisResults([{ type: 'generic', message: data.message || "Analysis complete, but no specific items found."}]);
      }

    } catch (error: any) {
      console.error("Error analyzing image:", error);
      toast({
        title: "Analysis Failed",
        description: error.message.includes("Failed to fetch") ? `Could not connect to the conceptual backend at ${conceptualBackendUrl}. Is your local Python server running? Original error: ${error.message}` : error.message,
        variant: "destructive",
        duration: 7000,
      });
      setAnalysisResults([{ type: 'error', message: error.message.includes("Failed to fetch") ? `Failed to connect to backend: ${conceptualBackendUrl}. Ensure local server is running.` : error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImageFile(null);
    setAnalysisResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderResultCard = (result: AnalysisResult, index: number) => {
    let icon = <SparklesIcon className="w-5 h-5 text-primary" />;
    let title = result.name || "Analysis Result";
    let content = <p>{result.message || "Details for this item."}</p>;

    if (result.type === 'hotel') {
      icon = <HotelIcon className="w-5 h-5 text-blue-400" />;
      content = (
        <div className="space-y-1">
          {result.image_url && (
            <div className="relative aspect-video w-full rounded-md overflow-hidden mb-2">
              <Image src={result.image_url} alt={title} fill={true} objectFit="cover" data-ai-hint="hotel room" />
            </div>
          )}
          <p>Type: Hotel</p>
          {result.similarity && <p>Similarity: <span className="font-semibold text-primary">{result.similarity}</span></p>}
        </div>
      );
    } else if (result.type === 'flight_details') {
      icon = <PlaneIcon className="w-5 h-5 text-green-400" />;
      title = "Extracted Flight Details";
      content = (
        <div className="space-y-1">
          <p>Airline: {result.airline}</p>
          <p>Route: {result.route}</p>
          <p>Price: <span className="font-semibold text-primary">{result.price}</span></p>
        </div>
      );
    } else if (result.type === 'error') {
        icon = <AlertTriangleIcon className="w-5 h-5 text-destructive" />;
        title = "Analysis Error";
        content = <p className="text-destructive">{result.message || "An error occurred during analysis."}</p>;
    }


    return (
      <Card key={index} className={cn("glass-card border-border/30", result.type === 'error' && "border-destructive/50")}>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          {content}
        </CardContent>
      </Card>
    );
  };


  return (
    <Card className={cn("glass-card border-indigo-500/30", "animate-fade-in-up w-full")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <ScanSearchIcon className="w-6 h-6 mr-2 text-indigo-400" />
            AI Visual Search & Comparison
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" disabled>
            (Interactive Demo)
          </Button>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Upload an image (hotel, destination, flight screenshot) to get AI-driven insights or find similar options. This demo connects to a conceptual local backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(
            "p-4 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary transition-colors",
            uploadedImage ? "border-primary/50" : "border-border/50"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleImageUpload}
            className="hidden"
            ref={fileInputRef}
            id="visual-search-upload"
          />
          {uploadedImage ? (
            <div className="relative group">
              <Image
                src={uploadedImage}
                alt="Uploaded preview"
                width={400}
                height={225}
                className="rounded-md object-contain max-h-60 mx-auto"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                aria-label="Remove image"
              >
                <Trash2Icon className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="text-muted-foreground">
              <UploadCloudIcon className="w-12 h-12 mx-auto mb-2 text-indigo-300" />
              <p className="font-semibold">Click to upload an image</p>
              <p className="text-xs">(PNG, JPG, WEBP - Max 5MB)</p>
            </div>
          )}
        </div>

        <Button
            onClick={handleAnalyzeImage}
            disabled={isLoading || !uploadedImage}
            size="lg"
            className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
        >
          {isLoading ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <SearchCheckIcon />
          )}
          {isLoading ? 'AI Analyzing...' : 'Analyze with AI'}
        </Button>

        {isLoading && !analysisResults && (
          <div className="text-center py-4 text-muted-foreground">
            <Loader2Icon className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
            <p>AI is processing your image, please wait...</p>
          </div>
        )}

        {analysisResults && (
          <div className="mt-4 space-y-3">
            <h3 className="text-md font-semibold text-card-foreground">Conceptual Analysis Results:</h3>
            {analysisResults.map(renderResultCard)}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
            This feature demonstrates frontend integration with a conceptual backend.
            The `fetch` call is currently configured to: <strong>{conceptualBackendUrl}</strong>.
            For a real application, set up and deploy your Python AI backend, then update this URL.
        </p>
      </CardFooter>
    </Card>
  );
}
