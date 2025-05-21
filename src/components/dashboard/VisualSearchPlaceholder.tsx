
"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, Image as ImageIcon, SearchCheck, AlertTriangle, Sparkles, Trash2, X, Camera, GitCompareArrows, ScanText, History, Heart, Info, Zap, CheckCircle, ScanSearch as LucideScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Types for analysis results
interface SimilarItemResult {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
  similarity?: string;
  price?: string;
  location?: string;
  tags?: string[];
}

interface ComparisonFeature {
  name: string;
  valueItem1: string;
  valueItem2: string;
  isMatching?: boolean;
}

interface ComparisonResult {
  item1: { name: string; imageUrl?: string; description?: string; keyFeatures: string[] };
  item2: { name: string; imageUrl?: string; description?: string; keyFeatures: string[] };
  sharedAspects: string[];
  distinctAspectsItem1: string[];
  distinctAspectsItem2: string[];
  aiSummary: string;
}

interface OcrResult {
  extractedText: string;
  identifiedEntities?: Array<{ type: string; value: string; confidence?: number }>;
}

type AnalysisResultType =
  | { mode: 'findSimilar'; items: SimilarItemResult[] }
  | { mode: 'compare'; comparison: ComparisonResult }
  | { mode: 'ocr'; ocr: OcrResult }
  | { mode: 'error'; message: string };

type AnalysisMode = 'findSimilar' | 'compare' | 'ocr';

// Defined Colors
const COLOR_BLUE = "#3B82F6";
const COLOR_TEAL = "#0EA5E9";
const COLOR_CORAL = "#F97066";
const COLOR_SUCCESS = "#10B981"; // Green
const COLOR_WARNING = "#F59E0B"; // Amber
const COLOR_ERROR_TEXT = "#EF4444"; // Red

export function VisualSearchPlaceholder() {
  const [imageFile1, setImageFile1] = useState<File | null>(null);
  const [uploadedImage1, setUploadedImage1] = useState<string | null>(null);
  const [imageFile2, setImageFile2] = useState<File | null>(null);
  const [uploadedImage2, setUploadedImage2] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('findSimilar');
  const [activeUploadSlot, setActiveUploadSlot] = useState<1 | 2>(1);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetUploadState = (slot?: 1 | 2) => {
    if (slot === 1 || !slot) {
      setImageFile1(null);
      setUploadedImage1(null);
    }
    if (slot === 2 || !slot) {
      setImageFile2(null);
      setUploadedImage2(null);
    }
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = event.target.files?.[0];
    if (file) processFile(file, slot);
  };

  const processFile = (file: File, slot: 1 | 2) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrorMessage("Image too large. Max 10MB.");
      toast({ title: "Upload Error", description: "Image too large. Max 10MB.", variant: "destructive" });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type.toLowerCase())) {
      setErrorMessage("Invalid file type. Use JPG, PNG, WEBP, HEIC/HEIF.");
      toast({ title: "Upload Error", description: "Invalid file type. Use JPG, PNG, WEBP, HEIC/HEIF.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (slot === 1) {
        setUploadedImage1(reader.result as string);
        setImageFile1(file);
      } else {
        setUploadedImage2(reader.result as string);
        setImageFile2(file);
      }
      setErrorMessage(null);
      setAnalysisResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, type: 'over' | 'leave' | 'drop') => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'over') setIsDragging(true);
    else if (type === 'leave') setIsDragging(false);
    else if (type === 'drop') {
      setIsDragging(false);
      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        const slotToUse = analysisMode === 'compare' ? (activeUploadSlot || (uploadedImage1 ? 2 : 1)) : 1;
        processFile(files[0], slotToUse);
        if (analysisMode === 'compare' && files.length > 1 && slotToUse === 1 && !uploadedImage2) {
           processFile(files[1], 2); // auto-fill second slot if two files dropped in compare mode
        }
      }
    }
  };
  
  // Camera Logic
  useEffect(() => {
    if (showCamera) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          setCameraStream(stream);
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          setErrorMessage("Camera access denied or unavailable.");
          setShowCamera(false);
          toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
        }
      };
      getCameraPermission();
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => { // Cleanup
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, toast]);

  const handleCaptureImage = () => {
    if (videoRef.current && canvasRef.current && cameraStream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      
      const slotToUse = analysisMode === 'compare' ? activeUploadSlot : 1;
      if (slotToUse === 1) setUploadedImage1(dataUrl);
      else setUploadedImage2(dataUrl);
      
      // Convert data URL to File object (optional, but good for consistency)
      fetch(dataUrl).then(res => res.blob()).then(blob => {
        const capturedFile = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
        if (slotToUse === 1) setImageFile1(capturedFile);
        else setImageFile2(capturedFile);
      });

      setShowCamera(false); // Close camera after capture
      setErrorMessage(null);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (analysisMode === 'compare' && (!imageFile1 || !imageFile2)) {
      setErrorMessage("Please upload two images for comparison.");
      return;
    }
    if (analysisMode !== 'compare' && !imageFile1) {
      setErrorMessage("Please upload an image to analyze.");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setErrorMessage(null);

    // Simulate Gemini AI Analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      if (analysisMode === 'findSimilar') {
        setAnalysisResult({
          mode: 'findSimilar',
          items: [
            { id: '1', name: "The Grand Budapest Hotel", imageUrl: "https://placehold.co/600x400.png?text=Grand+Budapest", dataAiHint: "grand hotel facade", similarity: "92%", price: "$250/night", location: "Zubrowka", tags: ["Luxury", "Historic", "Art Deco"] },
            { id: '2', name: "Modern Minimalist Resort", imageUrl: "https://placehold.co/600x400.png?text=Modern+Resort", dataAiHint: "modern resort pool", similarity: "88%", price: "$350/night", location: "Maldives", tags: ["Contemporary", "Beachfront", "Spa"] },
            { id: '3', name: "Cozy Mountain Lodge", imageUrl: "https://placehold.co/600x400.png?text=Mountain+Lodge", dataAiHint: "mountain lodge snow", similarity: "85%", price: "$180/night", location: "Swiss Alps", tags: ["Rustic", "Skiing", "Fireplace"] },
            { id: '4', name: "Urban Boutique Hotel", imageUrl: "https://placehold.co/600x400.png?text=Boutique+Hotel+City", dataAiHint: "boutique hotel city", similarity: "82%", price: "$220/night", location: "New York City", tags: ["Chic", "Central", "Rooftop Bar"] },
          ]
        });
      } else if (analysisMode === 'compare') {
        setAnalysisResult({
          mode: 'compare',
          comparison: {
            item1: { name: imageFile1?.name || "Uploaded Item 1", imageUrl: uploadedImage1 || undefined, description: "Elegant hotel with classic architecture.", keyFeatures: ["Pool", "Spa", "Fine Dining", "Historic Building"] },
            item2: { name: imageFile2?.name || "Uploaded Item 2", imageUrl: uploadedImage2 || undefined, description: "Modern resort with stunning ocean views.", keyFeatures: ["Beach Access", "Infinity Pool", "Spa", "Water Sports"] },
            sharedAspects: ["Spa", "Luxury"],
            distinctAspectsItem1: ["Historic Building", "Fine Dining (Classic Cuisine)"],
            distinctAspectsItem2: ["Beach Access", "Infinity Pool", "Water Sports", "Modern Design"],
            aiSummary: "Both options offer luxury spa experiences. Item 1 is a historic city hotel ideal for cultural immersion, while Item 2 is a modern beach resort perfect for relaxation and water activities. Your choice depends on whether you prefer urban exploration or a seaside escape."
          }
        });
      } else if (analysisMode === 'ocr') {
        setAnalysisResult({
          mode: 'ocr',
          ocr: {
            extractedText: "Flight UA123\nDepart: JFK 10:00 AM\nArrive: LAX 01:00 PM\nSeat: 22A\nPrice: $350.00",
            identifiedEntities: [
              { type: "Flight Number", value: "UA123", confidence: 0.95 },
              { type: "Departure Airport", value: "JFK", confidence: 0.92 },
              { type: "Arrival Airport", value: "LAX", confidence: 0.91 },
              { type: "Price", value: "$350.00", confidence: 0.98 },
            ]
          }
        });
      }
    } catch (e) {
      setErrorMessage("An error occurred during analysis.");
      setAnalysisResult({mode: 'error', message: "Failed to simulate analysis."});
    } finally {
      setIsLoading(false);
    }
  };

  const renderUploadArea = (slot: 1 | 2) => {
    const currentImage = slot === 1 ? uploadedImage1 : uploadedImage2;
    const currentFile = slot === 1 ? imageFile1 : imageFile2;
    const fileInput = slot === 1 ? fileInputRef1 : fileInputRef2;

    return (
      <div
        key={slot}
        className={cn(
          "relative p-4 border-2 border-dashed rounded-lg text-center transition-all duration-200 ease-in-out h-64 flex flex-col justify-center items-center",
          isDragging ? "border-[#3B82F6] bg-[#3B82F6]/10" : "border-border/50 hover:border-[#3B82F6]/70",
          (analysisMode === 'compare' && activeUploadSlot !== slot) ? "opacity-60" : ""
        )}
        onDragOver={(e) => handleDragEvents(e, 'over')}
        onDragLeave={(e) => handleDragEvents(e, 'leave')}
        onDrop={(e) => handleDragEvents(e, 'drop')}
        onClick={() => analysisMode === 'compare' && setActiveUploadSlot(slot)}
      >
        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, slot)} ref={fileInput} className="hidden" />
        {currentImage ? (
          <div className="relative group w-full h-full">
            <Image src={currentImage} alt={`Uploaded preview ${slot}`} layout="fill" objectFit="contain" className="rounded-md" />
            <Button
              variant="ghost"
              size="icon"
              style={{ backgroundColor: `${COLOR_CORAL}AA`, color: 'white' }}
              className="absolute top-2 right-2 opacity-70 group-hover:opacity-100 transition-opacity !p-1 h-7 w-7"
              onClick={(e) => { e.stopPropagation(); resetUploadState(slot); }}
              aria-label={`Remove image ${slot}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <UploadCloud className="w-12 h-12 text-[#0EA5E9]" />
            <p className="font-semibold text-sm text-card-foreground">
              {isDragging ? "Drop image here" : `Drag & drop or click to upload (Slot ${slot})`}
            </p>
            <p className="text-xs">(PNG, JPG, WEBP, HEIC - Max 10MB)</p>
            <Button
              variant="outline"
              size="sm"
              style={{ borderColor: COLOR_TEAL, color: COLOR_TEAL }}
              className="hover:bg-[#0EA5E9]/10 text-xs mt-1"
              onClick={(e) => { e.stopPropagation(); fileInput.current?.click(); }}
            >
              <ImageIcon className="w-3 h-3 mr-1.5" /> Select File
            </Button>
          </div>
        )}
      </div>
    );
  };
  
  // Render Logic for different analysis results
  const renderResults = () => {
    if (!analysisResult) return null;

    switch (analysisResult.mode) {
      case 'findSimilar':
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-card-foreground" style={{ color: COLOR_BLUE }}>Similar Items Found</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysisResult.items.map(item => (
                <Card key={item.id} className="glass-card overflow-hidden transform hover:scale-[1.02] transition-transform duration-200">
                  <div className="relative w-full aspect-video">
                    <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" data-ai-hint={item.dataAiHint} />
                    {item.similarity && <Badge className="absolute top-2 right-2" style={{backgroundColor: COLOR_CORAL, color: 'white'}}>{item.similarity}</Badge>}
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <CardTitle className="text-sm font-semibold text-card-foreground">{item.name}</CardTitle>
                    {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                    {item.price && <p className="text-sm font-medium" style={{color: COLOR_BLUE}}>{item.price}</p>}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs" style={{backgroundColor: `${COLOR_TEAL}20`, color: COLOR_TEAL, borderColor: `${COLOR_TEAL}50`}}>{tag}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'compare':
        const { item1, item2, sharedAspects, distinctAspectsItem1, distinctAspectsItem2, aiSummary } = analysisResult.comparison;
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-card-foreground" style={{ color: COLOR_BLUE }}>Comparison Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[item1, item2].map((item, index) => (
                <Card key={index} className="glass-card p-3">
                  <CardTitle className="text-sm font-semibold mb-1.5 text-card-foreground">
                    {index === 0 ? "Item 1: " : "Item 2: "} {item.name}
                  </CardTitle>
                  {item.imageUrl && <div className="relative w-full aspect-video rounded-md overflow-hidden mb-2"><Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" /></div>}
                  {item.description && <p className="text-xs text-muted-foreground mb-1.5">{item.description}</p>}
                  <h4 className="text-xs font-medium text-card-foreground mb-1">Key Features:</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                    {item.keyFeatures.map(f => <li key={f}>{f}</li>)}
                  </ul>
                </Card>
              ))}
            </div>
            <Card className="glass-card p-3">
              <CardTitle className="text-sm font-semibold mb-1.5 text-card-foreground">AI Insights</CardTitle>
              <p className="text-xs text-muted-foreground mb-1"><strong style={{color: COLOR_TEAL}}>Shared Aspects:</strong> {sharedAspects.join(', ') || 'None'}</p>
              <p className="text-xs text-muted-foreground mb-1"><strong style={{color: COLOR_TEAL}}>Distinct for Item 1:</strong> {distinctAspectsItem1.join(', ') || 'None'}</p>
              <p className="text-xs text-muted-foreground mb-1"><strong style={{color: COLOR_TEAL}}>Distinct for Item 2:</strong> {distinctAspectsItem2.join(', ') || 'None'}</p>
              <Separator className="my-2" />
              <p className="text-xs italic text-muted-foreground"><strong style={{color: COLOR_BLUE}}>AI Summary:</strong> {aiSummary}</p>
            </Card>
          </div>
        );
      case 'ocr':
        return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-card-foreground" style={{ color: COLOR_BLUE }}>Extracted Text & Entities</h3>
            <Card className="glass-card p-3">
              <CardTitle className="text-sm font-semibold mb-1.5 text-card-foreground">Full Extracted Text</CardTitle>
              <pre className="text-xs bg-muted/50 p-2 rounded whitespace-pre-wrap font-mono text-muted-foreground max-h-40 overflow-auto">{analysisResult.ocr.extractedText}</pre>
            </Card>
            {analysisResult.ocr.identifiedEntities && analysisResult.ocr.identifiedEntities.length > 0 && (
              <Card className="glass-card p-3">
                <CardTitle className="text-sm font-semibold mb-1.5 text-card-foreground">Identified Entities</CardTitle>
                <ul className="space-y-1">
                  {analysisResult.ocr.identifiedEntities.map((entity, i) => (
                    <li key={i} className="text-xs">
                      <strong style={{color: COLOR_TEAL}}>{entity.type}:</strong> <span className="text-muted-foreground">{entity.value}</span>
                      {entity.confidence && <span className="text-xs ml-1" style={{color: COLOR_BLUE}}>(Confidence: {(entity.confidence * 100).toFixed(0)}%)</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        );
       case 'error':
        return (
          <div className="flex items-center justify-center p-4 border border-destructive/50 bg-destructive/10 rounded-md text-destructive">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p className="text-sm">{analysisResult.message}</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <Card className={cn("glass-card w-full animate-fade-in-up")}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-xl text-card-foreground">
            <LucideScanSearch className="w-6 h-6 mr-2" style={{color: COLOR_BLUE}} />
            AI Visual Search & Analysis
          </CardTitle>
          {/* Placeholder for History/Favorites */}
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" title="Search History (coming soon)" disabled><History className="w-4 h-4"/></Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary h-8 w-8" title="Favorites (coming soon)" disabled><Heart className="w-4 h-4"/></Button>
          </div>
        </div>
        <CardDescription className="text-muted-foreground pt-1 text-sm">
          Upload image(s) to find similar options, compare items, or extract text using simulated AI analysis.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="flex items-center p-2 text-sm rounded-md" style={{backgroundColor: `${COLOR_CORAL}20`, color: COLOR_CORAL, border: `1px solid ${COLOR_CORAL}80`}}>
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            {errorMessage}
          </div>
        )}

        {/* Camera View */}
        {showCamera && (
          <Card className="glass-card p-3 space-y-2 mb-3" style={{borderColor: COLOR_TEAL}}>
             <div className="flex justify-between items-center">
                <p className="text-sm font-medium" style={{color: COLOR_TEAL}}>Live Camera Feed</p>
                <Button variant="ghost" size="icon" onClick={() => setShowCamera(false)} className="h-7 w-7"><X className="w-4 h-4"/></Button>
             </div>
             <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
             <canvas ref={canvasRef} className="hidden"></canvas>
             {hasCameraPermission === false && <p className="text-xs" style={{color: COLOR_ERROR_TEXT}}>Camera permission denied or camera not found.</p>}
             <Button onClick={handleCaptureImage} disabled={!hasCameraPermission || !cameraStream} className="w-full text-sm" style={{backgroundColor: COLOR_TEAL, color: 'white'}}>
                <Camera className="w-4 h-4 mr-1.5"/> Capture Image
             </Button>
          </Card>
        )}

        {/* Upload Area */}
        <div className={cn("grid gap-3", analysisMode === 'compare' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
          {renderUploadArea(1)}
          {analysisMode === 'compare' && renderUploadArea(2)}
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={() => (analysisMode === 'compare' ? fileInputRef1 : fileInputRef1).current?.click()} className="text-xs flex-1" style={{borderColor: COLOR_TEAL, color: COLOR_TEAL, backgroundColor: `${COLOR_TEAL}10`}}>
            <ImageIcon className="w-3 h-3 mr-1.5" /> Upload Image
            {analysisMode === 'compare' && activeUploadSlot === 1 && " (Slot 1)"}
            {analysisMode === 'compare' && activeUploadSlot === 2 && " (Slot 2)"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCamera(true)} className="text-xs flex-1" style={{borderColor: COLOR_TEAL, color: COLOR_TEAL, backgroundColor: `${COLOR_TEAL}10`}}>
            <Camera className="w-3 h-3 mr-1.5" /> Use Camera
             {analysisMode === 'compare' && activeUploadSlot === 1 && " (Slot 1)"}
            {analysisMode === 'compare' && activeUploadSlot === 2 && " (Slot 2)"}
          </Button>
        </div>

        <Separator className="my-3" />

        {/* Analysis Mode Selector */}
        <Tabs value={analysisMode} onValueChange={(value) => { setAnalysisMode(value as AnalysisMode); setAnalysisResult(null); setActiveUploadSlot(1); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 p-1" style={{backgroundColor: `hsl(var(--muted)/0.5)`}}>
            <TabsTrigger value="findSimilar" className="text-xs h-full data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white data-[state=active]:shadow-md"><SearchCheck className="w-3.5 h-3.5 mr-1 sm:mr-1.5"/>Find Similar</TabsTrigger>
            <TabsTrigger value="compare" className="text-xs h-full data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white data-[state=active]:shadow-md"><GitCompareArrows className="w-3.5 h-3.5 mr-1 sm:mr-1.5"/>Compare</TabsTrigger>
            <TabsTrigger value="ocr" className="text-xs h-full data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white data-[state=active]:shadow-md"><ScanText className="w-3.5 h-3.5 mr-1 sm:mr-1.5"/>Extract Text</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          onClick={handleAnalyze}
          disabled={isLoading || (analysisMode === 'compare' ? (!imageFile1 || !imageFile2) : !imageFile1)}
          size="lg"
          className="w-full text-base py-2.5 mt-3 transition-all duration-200 ease-in-out transform hover:scale-[1.01]"
          style={{backgroundColor: COLOR_BLUE, color: 'white'}}
        >
          {isLoading ? (
            <Loader2 className="animate-spin w-5 h-5 mr-2" />
          ) : (
            <Zap className="w-5 h-5 mr-2" />
          )}
          {isLoading ? 'AI Analyzing...' : 'Analyze with AI'}
        </Button>

        {/* Results Display */}
        {isLoading && !analysisResult && (
          <div className="text-center py-6 text-muted-foreground space-y-2">
            <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{color: COLOR_BLUE}} />
            <p className="text-sm font-medium">Simulating Gemini AI analysis...</p>
            <p className="text-xs">Please wait while we process your request.</p>
          </div>
        )}
        
        {analysisResult && !isLoading && (
          <div className="mt-5 animate-fade-in space-y-3">
            <Separator className="my-3"/>
            {renderResults()}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-3">
        <p className="text-xs text-muted-foreground text-center w-full">
          <Info className="w-3 h-3 inline mr-1" />
          Visual search and analysis features are simulated. Actual AI processing requires a backend.
        </p>
      </CardFooter>
    </Card>
  );
}
