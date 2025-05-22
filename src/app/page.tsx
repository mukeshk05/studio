
"use client";

import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useState, useCallback } from 'react';
import { AppLogo } from '@/components/layout/app-logo';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from '@/lib/utils';
import {
  Accessibility,
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  BookCopy,
  BookHeart,
  BookOpenText,
  Bot,
  BrainCircuit,
  Building2,
  CalendarCheck,
  Camera,
  CheckCircle,
  DollarSign,
  Eye,
  Gift,
  GitCompareArrows,
  Heart,
  HeartPulse,
  Languages,
  LayoutGrid,
  Layers,
  Leaf,
  ListChecks,
  ListPlus,
  LocateFixed,
  LogIn,
  LogOut,
  Luggage,
  MapPin,
  MapPinned,
  MessageCircleQuestion,
  MessageSquareText,
  Moon,
  PanelLeft,
  PiggyBank,
  Plane,
  Replace,
  Route,
  Scale,
  ScanEye,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  User,
  UserPlus,
  Users,
  UsersRound,
  Volume2,
  Wand2,
  Zap,
  CurlyBraces,
  ImageOff,
} from 'lucide-react';
import { getLandingPageImagesWithFallback, type ImageRequest } from './actions';
import { useToast } from '@/hooks/use-toast';


const features = [
    {
      id: "feature-ai-trip-planner",
      icon: <Wand2 className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI-Powered Trip Planner",
      description: "Hyper-personalized itineraries! Define destination, dates, budget, mood, and your Travel DNA. Our AI Guardian crafts detailed plans, fusing preferences with weather, risk, and visa awareness.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "intelligent itinerary generation"
    },
    {
      id: "feature-price-suite",
      icon: <BarChart3 className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Smart Price Suite",
      description: "Track flight/hotel prices, get AI advice on when to book, and view illustrative price forecast graphs to make informed, budget-conscious decisions.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai price analysis chart"
    },
    {
      id: "feature-travel-dna",
      icon: <BrainCircuit className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Discover Your Travel DNA",
      description: "Our Adventure Quiz uncovers your unique travel persona. This 'Travel DNA' empowers Aura AI to personalize all future travel suggestions and plans for you.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai travel preferences quiz"
    },
    {
      id: "feature-aura-ai-engine",
      icon: <MessageSquareText className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Aura AI: Predictive Preference Fusion Engine",
      description: "Describe your ideal trip, or leave fields blank! Aura AI fuses your Travel DNA, search history, and queries to predict & suggest ideal trip bundles.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "conversational ai travel chat"
    },
    {
      id: "feature-group-planning",
      icon: <UsersRound className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Effortless Group Planning & Memories",
      description: "Input companion preferences for an AI 'Group Sync Report' to harmonize the trip. Plus, get AI-generated memory snippets for your saved trips.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai group travel collaboration"
    },
    {
      id: "feature-proactive-alerter",
      icon: <BellRing className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Proactive AI Alerter & Advisor",
      description: "Stay ahead! Our AI conceptually monitors for you. Imagine getting proactive alerts for significant price drops, major weather warnings for your trips, or even visa policy shifts (future vision). It can then offer timely rebooking advice or backup plan suggestions.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai proactive travel alerts"
    },
    {
      id: "feature-journey-sentinel",
      icon: <Bot className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Proactive Journey Sentinel AI",
      description: "Our AI proactively considers general travel risks, reminds you about visa checks, and incorporates typical weather patterns into your trip plans for a safer journey.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "travel safety shield ai"
    },
    {
      id: "feature-sustainable-footprint",
      icon: <Leaf className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Sustainable Footprint Optimizer AI",
      description: "Our AI Trip Planner conceptually includes sustainability factors, promoting awareness for eco-friendly choices and local support during your travels.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "eco friendly travel planning"
    },
     {
      id: "feature-serendipity-engine",
      icon: <LocateFixed className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Serendipity Engine (Future Vision)",
      description: "Imagine discovering spontaneous, hyper-local events unfolding near you in real-time, perfectly matched to your Travel DNA and current mood.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "real time local discovery ai"
    },
     {
      id: "feature-authenticity-verifier",
      icon: <ScanSearch className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI Authenticity Verifier (Future Vision)",
      description: "Conceptually, verify local crafts, food, and experiences. Upload a photo, and AI provides insights on origin, value, and authenticity markers.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai authenticity check travel"
    },
    {
      id: "feature-smart-map",
      icon: <MapPinned className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Interactive Smart Map (Future Vision)",
      description: "Visually explore destinations with AI-curated points of interest, smart clustering, and personalized filters based on your Travel DNA.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "interactive map trip planning"
    },
    {
      id: "feature-what-if-simulator",
      icon: <GitCompareArrows className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI 'What If' Travel Simulator (Future Vision)",
      description: "Explore alternative travel scenarios with AI. 'What if I went to Vietnam instead of Bali?' Get comparisons of cost, weather, activities, and vibe.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai travel scenario comparison"
    },
    {
      id: "feature-ar-preview",
      icon: <Camera className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI + AR Destination Preview (Conceptual)",
      description: "See your destination hotspots in real-time AR, with AI mood tags like 'Busy now,' 'Romantic lighting,' or 'Best photo time: 6:35 PM.'",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "augmented reality travel"
    },
    {
      id: "feature-co-travel-agent",
      icon: <MessageCircleQuestion className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI Co-Travel Agent (Ask Anything!)",
      description: "Get instant answers to travel questions: customs, tipping, local laws, phrases, and more. Your AI companion provides dynamic checklists and insights.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai travel question answer"
    },
    {
      id: "feature-mood-optimizer",
      icon: <SlidersHorizontal className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Mood & Energy Optimizer (Future Vision)",
      description: "Adjust your day's intensity with a slider, and Aura AI reshuffles your schedule, considering mood, energy, and even wearable data in the future.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "travel wellness planning slider"
    },
    {
      id: "feature-dynamic-itinerary",
      icon: <Activity className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Dynamic Itinerary Reshaper (Conceptual)",
      description: "Future-forward: Imagine your itinerary dynamically adjusting based on real-time bio-feedback from wearables, optimizing for your energy and mood.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "bio feedback travel ai"
    },
    {
      id: "feature-story-weaver",
      icon: <BookHeart className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Generational Story Weaver AI (Evolved Diary)",
      description: "Beyond simple snippets, envision an AI that helps weave rich, multimedia travel diaries and uncovers travel narratives across generations.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai travel storytelling generational"
    },
    {
      id: "feature-calendar-sync",
      icon: <CalendarCheck className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI Calendar SyncUp (Future Vision)",
      description: "BudgetRoam AI syncs with your calendar, identifies free slots, and proactively suggests personalized trip ideas that fit your schedule.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai calendar travel scheduling"
    },
    {
      id: "feature-language-coach",
      icon: <Languages className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI Hyper-Local Language Coach (Future Vision)",
      description: "Go beyond basic phrases! Learn local dialects, slang, and idioms. Get real-time pronunciation feedback and cultural context to engage authentically.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai language learning app"
    },
    {
      id: "feature-digital-twin",
      icon: <CurlyBraces className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Predictive 'Digital Twin' Explorer (Future Vision)",
      description: "Explore AI-generated 'digital twins' of cities or attractions. Simulate crowds, queues, and ambiance based on historical data, events, and weather forecasts.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai digital twin city simulation"
    },
    {
      id: "feature-affective-vibe",
      icon: <HeartPulse className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "Affective Group Vibe Optimizer (Future Vision)",
      description: "AI (with consent) subtly sensing group vibe to suggest adjustments for better cohesion & enjoyment.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai group mood travel positive"
    },
    {
      id: "feature-ethical-auditor",
      icon: <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI Ethical & Sustainable Impact Auditor (Future Vision)",
      description: "Deep ethical/sustainability audit of your itinerary, with vetted alternatives for responsible travel, considering fair wages, animal welfare, over-tourism, and community support.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ethical sustainable travel audit"
    },
    {
      id: "feature-accessibility-scout",
      icon: <Accessibility className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI Personalized Accessibility Scout (Future Vision)",
      description: "Detail your specific accessibility needs (step-free, quiet zones, dietary restrictions). Our AI (future vision) will deeply vet every aspect of your trip for a truly tailored and comfortable experience.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "inclusive accessible travel ai"
    },
    {
      id: "feature-legend-narrator",
      icon: <BookOpenText className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI Local Legend & Folklore Narrator (Future Vision)",
      description: "Explore with an AI narrator! Get obscure local legends, folklore, and historical anecdotes tied to your precise location, bringing the intangible cultural heritage of a place to life as you experience it.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai storytelling travel folklore"
    },
    {
      id: "feature-opportunity-hunter",
      icon: <Zap className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI Unexpected Opportunity Hunter",
      description: "The AI constantly scans for last-minute, high-value, and highly personalized opportunities aligned with your \"Travel DNA\" and current itinerary context. This could be a just-released discounted ticket to a niche show matching your interests, a renowned local chef doing a one-night-only pop-up that fits your culinary profile, a sudden opening on a popular, usually booked-out small-group tour, or even an alert about a rare celestial event visible from your location. Novelty: Proactive identification and alerting of fleeting, highly personalized opportunities that align with deep user preferences, beyond generic deals.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai travel opportunity discovery"
    },
    {
      id: "feature-budget-rebalancer",
      icon: <PiggyBank className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "Dynamic AI Travel Budget Re-balancer & Forecaster",
      description: "Users set an overall trip budget. As they make bookings or the AI suggests options, the AI tracks spending against categories in real-time. If a user overspends on a luxury hotel, the AI might proactively suggest more budget-friendly (but still persona-aligned) dining options or highlight free activities. It could also forecast if you're on track to meet your budget and offer re-balancing scenarios. Novelty: Real-time, intelligent budget tracking and dynamic re-allocation advice based on actual and planned spending, with forecasting.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai budget travel forecast"
    },
    {
      id: "feature-itinerary-assistance",
      icon: <ListPlus className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI Itinerary Planning Assistance (Future Vision)",
      description: "Once you have a core booking, AI suggests compatible activities, tours, or restaurants to build out your full, personalized itinerary.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai itinerary builder planning"
    },
    {
      id: "feature-visual-search",
      icon: <ScanSearch className="w-10 h-10 mx-auto mb-3 text-accent" />,
      title: "AI Visual Search & Analysis (Future Vision)",
      description: "Upload a photo of a hotel or destination to find similar options, or compare flights/hotels side-by-side with AI-extracted feature analysis.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "ai visual search interface travel"
    },
    {
      id: "feature-post-trip-synthesizer",
      icon: <Layers className="w-10 h-10 mx-auto mb-3 text-primary" />,
      title: "AI Post-Trip Synthesizer & Trajectory Mapper",
      description: "Share photos, journals, and feedback. AI analyzes this to refine your Travel DNA and uniquely maps future 'travel trajectories'—a series of evolving experiences based on your positive past travels.",
      imgSrc: "https://placehold.co/600x400.png",
      dataAiHint: "travel memories future paths ai"
    }
  ];


const whyChooseUsPoints = [
    "Hyper-Personalized with Travel DNA: Itineraries and bundles uniquely tailored to *your* style.",
    "Predictive Preference Fusion: Aura AI intelligently fuses your history, persona, and queries.",
    "Comprehensive AI Guardian: Considers risks, visa needs, and weather for smoother trips.",
    "Budget-Conscious & Smart Tools: Maximize experiences with price tracking, forecasts, and AI advice.",
    "Modern & Intuitive: A seamless, ChatGPT-like planning experience with a stunning glassy UI.",
    "All-in-One Dashboard: Your trips, alerts, Aura AI, and memory archive in one place."
  ];

function useStaggeredAnimation(count: number, delayIncrement: number, trigger: boolean) {
  const [visibility, setVisibility] = useState(Array(count).fill(false));

  useEffect(() => {
    if (trigger) {
      const timers = visibility.map((_, index) =>
        setTimeout(() => {
          setVisibility(prev => {
            const newVisibility = [...prev];
            newVisibility[index] = true;
            return newVisibility;
          });
        }, index * delayIncrement)
      );
      return () => timers.forEach(clearTimeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, count, delayIncrement]);

  return visibility;
}

interface LoadingScreenProps {
  progress: number;
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, message }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
      <div className="text-center space-y-6 p-8 rounded-xl glass-card border-primary/30">
        <AppLogo />
        <Progress value={progress} className="w-64 sm:w-80 mx-auto [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent" />
        <p className="text-lg font-medium text-foreground">{message}</p>
        <p className="text-sm text-muted-foreground">BudgetRoam AI is preparing your experience...</p>
      </div>
    </div>
  );
};


export default function LandingPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [featuresSectionVisible, setFeaturesSectionVisible] = useState(false);
  const [whyChooseUsSectionVisible, setWhyChooseUsSectionVisible] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);

  const whyChooseUsListVisible = useStaggeredAnimation(whyChooseUsPoints.length, 100, whyChooseUsSectionVisible);
  const featureCardsVisible = useStaggeredAnimation(features.length, 150, featuresSectionVisible);
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");

  type ImageUriMap = Record<string, string | null | '__error__'>;
  const [heroImageUris, setHeroImageUris] = useState<ImageUriMap>({});
  const [featureImageUris, setFeatureImageUris] = useState<ImageUriMap>({});


  const handleErrorState = useCallback((id: string, type: 'hero' | 'feature') => {
    console.log(`[LandingPage] Image load error for ID: ${id}, type: ${type}`);
    if (type === 'hero') {
      setHeroImageUris(prev => ({ ...prev, [id]: '__error__' }));
    } else {
      setFeatureImageUris(prev => ({ ...prev, [id]: '__error__' }));
    }
  }, []);


  useEffect(() => {
    const fetchAllImagesAndLoadContent = async () => {
      console.log("[LandingPage] Initializing image fetch...");
      setIsPageLoading(true);
      setLoadProgress(10);
      setLoadingMessage("Warming up Aura AI...");

      const allImageRequests: ImageRequest[] = [];

      // Prepare hero image requests (using first 3 features for hero carousel)
      features.slice(0, 3).forEach((feature, index) => {
        allImageRequests.push({
          id: `hero-${feature.id}`, // Ensure hero IDs are distinct
          promptText: feature.dataAiHint,
          styleHint: 'hero',
        });
      });

      // Prepare feature card image requests
      features.forEach((feature) => {
        allImageRequests.push({
          id: feature.id, // Use the feature's own ID
          promptText: feature.dataAiHint,
          styleHint: 'featureCard',
        });
      });
      
      console.log("[LandingPage] All Image Requests Prepared:", allImageRequests);

      setLoadProgress(25);
      setLoadingMessage("Checking visual cache...");

      try {
        setLoadProgress(50);
        setLoadingMessage("Generating fresh visuals with AI...");
        const fetchedUris = await getLandingPageImagesWithFallback(allImageRequests);
        console.log("[LandingPage] Fetched URIs from server action:", fetchedUris);

        setLoadProgress(85);
        setLoadingMessage("Almost there...");

        const newHeroUris: ImageUriMap = {};
        const newFeatureUris: ImageUriMap = {};

        allImageRequests.forEach(req => {
          const uri = fetchedUris[req.id];
          if (req.id.startsWith('hero-')) {
            newHeroUris[req.id] = uri === undefined ? null : uri;
          } else {
            newFeatureUris[req.id] = uri === undefined ? null : uri;
          }
        });
        
        console.log("[LandingPage] Setting hero URIs:", newHeroUris);
        setHeroImageUris(newHeroUris);
        console.log("[LandingPage] Setting feature URIs:", newFeatureUris);
        setFeatureImageUris(newFeatureUris);

        setLoadProgress(100);
        setLoadingMessage("Welcome to BudgetRoam!");

        setTimeout(() => {
          setIsPageLoading(false);
          console.log("[LandingPage] Image loading complete.");
          // Trigger content animations after loading is done
          const heroTimer = setTimeout(() => setHeroVisible(true), 50);
          const featuresTimer = setTimeout(() => setFeaturesSectionVisible(true), 250);
          const whyUsTimer = setTimeout(() => setWhyChooseUsSectionVisible(true), 450);
          const ctaTimer = setTimeout(() => setFinalCtaVisible(true), 650);
          return () => {
            clearTimeout(heroTimer);
            clearTimeout(featuresTimer);
            clearTimeout(whyUsTimer);
            clearTimeout(ctaTimer);
          };
        }, 500); // Delay to show 100% progress

      } catch (error) {
        console.error("[LandingPage] Critical error fetching page images:", error);
        setLoadingMessage("Error loading visuals. Displaying static content.");
        toast({
            title: "Visuals Error",
            description: "Could not load all AI-powered visuals. Displaying default content.",
            variant: "destructive"
        });
        setLoadProgress(100); // Still complete progress
        setTimeout(() => {
            setIsPageLoading(false); // Show page even if images fail
            // Trigger content animations
            const heroTimer = setTimeout(() => setHeroVisible(true), 50);
            const featuresTimer = setTimeout(() => setFeaturesSectionVisible(true), 250);
            const whyUsTimer = setTimeout(() => setWhyChooseUsSectionVisible(true), 450);
            const ctaTimer = setTimeout(() => setFinalCtaVisible(true), 650);
            return () => {
                clearTimeout(heroTimer);
                clearTimeout(featuresTimer);
                clearTimeout(whyUsTimer);
                clearTimeout(ctaTimer);
            };
        }, 500);
      }
    };

    fetchAllImagesAndLoadContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run once on mount

  const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50";

  if (isPageLoading) {
    return <LoadingScreen progress={loadProgress} message={loadingMessage} />;
  }

  return (
        <div className="flex flex-col min-h-screen text-foreground overflow-x-hidden relative">
          <div className="absolute inset-0 z-[-1]">
            <Image
              src="https://images.pexels.com/photos/3155666/pexels-photo-3155666.jpeg"
              alt="Tropical beach with palm trees and clear blue water"
              fill
              className="object-cover"
              quality={90}
              priority
            />
            <div className="absolute inset-0 bg-black/40 dark:bg-black/40"></div>
          </div>

          <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-pane">
            <div className="container mx-auto flex h-20 items-center justify-between px-4">
              <AppLogo />
              <nav className="flex items-center space-x-2 sm:space-x-4">
                <Link href="/travel" className="text-sm font-medium text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5">
                  <Plane className="w-4 h-4" /> Travel
                </Link>
                <Link href="#features" className="text-sm font-medium text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4" /> Features
                </Link>
                <Link href="#why-us" className="text-sm font-medium text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5">
                  <Heart className="w-4 h-4" /> Why Us
                </Link>

                {authLoading ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20 rounded-md bg-muted/50" />
                    <Skeleton className="h-9 w-9 rounded-full bg-muted/50 hidden sm:block" />
                  </div>
                ) : currentUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-accent/20">
                        <Avatar className="h-9 w-9 border border-primary/50">
                          <AvatarImage
                            src={currentUser.photoURL || undefined}
                            alt={currentUser.displayName || currentUser.email || "User avatar"}
                          />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 glass-card border-border/50" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none text-card-foreground">
                            {currentUser.displayName || currentUser.email?.split('@')[0]}
                          </p>
                          {currentUser.email && (
                             <p className="text-xs leading-none text-muted-foreground">
                              {currentUser.email}
                            </p>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/50"/>
                      <DropdownMenuItem asChild>
                         <Link href="/planner" className="cursor-pointer focus:bg-accent/20 focus:text-accent-foreground flex items-center">
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Go to App
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={logout} className="cursor-pointer focus:bg-destructive/20 focus:text-destructive-foreground flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex items-center text-primary-foreground bg-primary/10 border-primary/30 hover:bg-primary/20 glass-interactive")}
                    >
                      <Link href="/login" className="flex items-center">
                        <LogIn className="mr-1 h-4 w-4" /> Login
                      </Link>
                    </Button>
                     <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label="Login"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "sm:hidden text-primary hover:bg-primary/20")}
                      >
                        <Link href="/login"><LogIn /></Link>
                      </Button>
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden sm:inline-flex items-center shadow-md shadow-primary/40 hover:shadow-lg hover:shadow-primary/50 bg-primary hover:bg-accent text-primary-foreground hover:text-accent-foreground")}
                    >
                      <Link href="/signup" className="flex items-center">
                        <UserPlus className="mr-1 h-4 w-4" /> Sign Up
                      </Link>
                    </Button>
                     <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="Sign Up"
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "sm:hidden text-primary hover:bg-primary/20")}
                     >
                      <Link href="/signup"><UserPlus /></Link>
                    </Button>
                  </>
                )}
              </nav>
            </div>
          </header>

          <main className="flex-grow z-10">
            <section className="py-20 md:py-32 text-center">
              <div className="container mx-auto px-4">
                <h1
                  className={cn(
                    "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-6 transition-all duration-700 ease-out",
                    heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  )}
                >
                  Experience the Future of Travel with <span className="text-primary">BudgetRoam AI</span>
                </h1>
                <p
                  className={cn(
                    "text-lg sm:text-xl text-slate-200 dark:text-muted-foreground mb-10 max-w-3xl mx-auto transition-all duration-700 ease-out",
                    heroVisible ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-10'
                  )}
                >
                 BudgetRoam leverages cutting-edge AI to craft hyper-personalized trips, track prices, offer predictive insights, and even sync group plans, all tailored to your unique Travel DNA and enriched by real-time (conceptual) local insights. Let Aura AI be your smart travel companion!
                </p>
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "text-lg px-8 py-3 group transform transition-all duration-700 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:scale-105 active:scale-100",
                    "bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 text-primary-foreground",
                    heroVisible ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-10'
                  )}
                >
                  <Link href={currentUser ? "/planner" : "/signup"} className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 transition-transform group-hover:animate-pulse" />
                    {currentUser ? "Plan New Trip" : "Get Started Free"}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <div
                  className={cn(
                    "mt-16 relative rounded-xl shadow-2xl overflow-hidden border-2 border-primary/30 transition-all duration-1000 ease-out",
                    "w-full",
                    heroVisible ? 'opacity-100 scale-100 delay-500' : 'opacity-0 scale-90'
                  )}
                >
                   <Carousel
                    opts={{ loop: true, align: "start" }}
                    className="w-full"
                  >
                    <CarouselContent>
                      {features.slice(0, 3).map((feature, index) => {
                        const heroImageId = `hero-${feature.id}`;
                        const currentHeroImageUri = heroImageUris[heroImageId];
                        const isLoadingImage = currentHeroImageUri === undefined; // Still loading from server
                        const hasError = currentHeroImageUri === '__error__';
                        const displaySrc = (currentHeroImageUri && !hasError) ? currentHeroImageUri : feature.imgSrc;

                        return (
                          <CarouselItem key={heroImageId}>
                            <div className={cn("relative w-full aspect-square")}>
                              {isLoadingImage ? (
                                <Skeleton className="w-full h-full rounded-lg" />
                              ) : (hasError && !feature.imgSrc) || (!currentHeroImageUri && !feature.imgSrc && !isLoadingImage) ? (
                                <div className="w-full h-full rounded-lg bg-muted/30 flex items-center justify-center">
                                  <ImageOff className="w-16 h-16 text-muted-foreground" />
                                </div>
                              ) : (
                                <>
                                  <Image
                                    src={displaySrc}
                                    alt={feature.title}
                                    fill
                                    className="object-cover rounded-lg"
                                    priority={index < 2} // Prioritize first couple of images
                                    onError={() => handleErrorState(heroImageId, 'hero')}
                                    sizes="100vw" // Simplified sizes for hero
                                  />
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 text-center">
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_0.5)] mb-2">
                                      {feature.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-200 [text-shadow:_0_1px_2px_rgb(0_0_0_/_0.5)] line-clamp-2 sm:line-clamp-3 max-w-prose">
                                      {feature.description}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary" />
                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white bg-black/50 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary" />
                  </Carousel>
                </div>
              </div>
            </section>

            <section id="features" className={cn("py-16 md:py-24 transition-opacity duration-1000", featuresSectionVisible ? 'opacity-100' : 'opacity-0')}>
              <div className="container mx-auto px-4">
                <h2 className={cn("text-3xl sm:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4 transition-all duration-700 ease-out", featuresSectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5')}>Explore Our Cutting-Edge AI Travel Features</h2>
                <p className={cn("text-lg text-slate-200 dark:text-muted-foreground text-center mb-12 max-w-xl mx-auto transition-all duration-700 ease-out", featuresSectionVisible ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 translate-y-5')}>
                  Discover how BudgetRoam's AI makes travel planning smarter, easier, and more personalized than ever.
                </p>
                <Carousel
                  opts={{
                    align: "start",
                    loop: features.length > 2,
                  }}
                  className="w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {features.map((feature, index) => {
                      const featureImageId = feature.id;
                      const currentFeatureImageUri = featureImageUris[featureImageId];
                      const isLoadingImage = currentFeatureImageUri === undefined;
                      const hasError = currentFeatureImageUri === '__error__';
                      const displaySrc = (currentFeatureImageUri && !hasError) ? currentFeatureImageUri : feature.imgSrc;

                      return (
                        <CarouselItem key={feature.id} className={cn(
                            "pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 transition-all duration-500 ease-out",
                            featureCardsVisible[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                          )}
                        >
                          <div className="p-1 h-full">
                            <Card
                              className={cn(
                                glassCardClasses,
                                "hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300 flex flex-col h-full transform border-primary/20 hover:border-accent/40"
                              )}
                            >
                              <CardHeader className="items-center text-center pt-6 px-6 pb-4">
                                {React.cloneElement(feature.icon, { className: cn(feature.icon.props.className, "mx-auto mb-3", index % 2 === 0 ? 'text-primary' : 'text-accent') })}
                                <CardTitle className="text-xl text-card-foreground">{feature.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="flex-grow px-6 pb-6 text-left">
                                <div className="relative aspect-video w-full rounded-md overflow-hidden mb-4 border border-border/30 group">
                                  {isLoadingImage ? (
                                    <Skeleton className="w-full h-full rounded-md" />
                                  ) : (hasError && !feature.imgSrc) || (!currentFeatureImageUri && !feature.imgSrc && !isLoadingImage) ? (
                                    <div className="w-full h-full rounded-md bg-muted/30 flex items-center justify-center">
                                      <ImageOff className="w-10 h-10 text-muted-foreground" />
                                    </div>
                                  ) : (
                                    <Image
                                      src={displaySrc}
                                      alt={feature.title}
                                      fill
                                      className="object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                      onError={() => handleErrorState(featureImageId, 'feature')}
                                    />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="ml-8 sm:ml-0 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />
                  <CarouselNext className="mr-8 sm:mr-0 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-accent" />
                </Carousel>
              </div>
            </section>

            <section id="why-us" className={cn("py-16 md:py-24 transition-opacity duration-1000", whyChooseUsSectionVisible ? 'opacity-100' : 'opacity-0')}>
              <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className={cn("transition-all duration-700 ease-out", whyChooseUsSectionVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
                    <h2 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-6">
                      Why Choose <span className="text-primary">BudgetRoam AI</span>?
                    </h2>
                    <p className="text-lg text-slate-200 dark:text-muted-foreground mb-8">
                      We believe amazing travel experiences shouldn't break the bank. BudgetRoam is designed to be your intelligent partner, making dream vacations accessible and stress-free with unparalleled AI assistance.
                    </p>
                    <ul className="space-y-3">
                      {whyChooseUsPoints.map((point, index) => (
                        <li
                          key={index}
                          className={cn(
                            "flex items-start transition-all duration-500 ease-out",
                            whyChooseUsListVisible[index] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
                          )}
                        >
                          <CheckCircle className="w-6 h-6 text-accent mr-3 mt-0.5 shrink-0" />
                          <span className="text-slate-200 dark:text-muted-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={cn("relative aspect-square max-w-md mx-auto md:max-w-none transition-all duration-700 ease-out",  whyChooseUsSectionVisible ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-90")}>
                    <Image
                        src="https://placehold.co/600x600.png"
                        alt="happy diverse travelers"
                        fill
                        className="object-cover rounded-xl shadow-2xl shadow-primary/20 transform hover:scale-105 hover:shadow-primary/30 transition-all duration-500 ease-out"
                        data-ai-hint="happy diverse travelers"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={cn("py-20 md:py-28 text-center transition-opacity duration-1000", finalCtaVisible ? 'opacity-100' : 'opacity-0')}>
              <div className="container mx-auto px-4">
                <h2 className={cn("text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-6 flex items-center justify-center transition-all duration-700 ease-out", finalCtaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
                  <Sparkles className="w-10 h-10 mr-3 text-primary animate-pulse" />
                  Ready to Redefine Your Travels?
                </h2>
                <p className={cn("text-lg text-slate-200 dark:text-muted-foreground mb-10 max-w-xl mx-auto transition-all duration-700 ease-out", finalCtaVisible ? "opacity-100 translate-y-0 delay-100" : "opacity-0 translate-y-10")}>
                  Join thousands of savvy travelers leveraging BudgetRoam AI to plan their next extraordinary adventure.
                </p>
                <Button
                    asChild
                    size="lg"
                    className={cn(
                        "text-lg px-10 py-3 group transform transition-all duration-700 ease-out shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:scale-105 active:scale-100",
                        "bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 text-primary-foreground",
                        finalCtaVisible ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-10"
                    )}
                >
                  <Link href={currentUser ? "/planner" : "/signup"} className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 transition-transform group-hover:animate-pulse" />
                    {currentUser ? "Start Planning Now" : "Unlock Your AI Travel Assistant"}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </section>
          </main>

          <footer className={cn("py-8 backdrop-blur-sm border-t border-border/30 z-10", "bg-[hsl(205_80%_85%_/_0.7)] dark:bg-black/50")}>
            <div className="container mx-auto px-4 text-center">
              <div className="flex justify-center mb-2">
                <AppLogo />
              </div>
              <p className="text-sm text-foreground dark:text-muted-foreground">
                &copy; {new Date().getFullYear()} BudgetRoam AI. All rights reserved.
              </p>
              <p className="text-xs mt-1 text-foreground dark:text-muted-foreground">Your smart companion for budget-friendly, AI-powered adventures.</p>
            </div>
          </footer>
        </div>
  );
}

