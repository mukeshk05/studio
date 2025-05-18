
"use client";

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/layout/app-logo';
import {
  ArrowRightIcon,
  SparklesIcon,
  ListChecksIcon,
  LogInIcon,
  UserPlusIcon,
  Wand2Icon, 
  HeartIcon,
  UserIcon,
  LogOutIcon,
  CheckCircleIcon, 
  ShieldCheckIcon, 
  MessageSquareHeartIcon, 
  RouteIcon, 
  TrendingUpIcon, 
  UsersRoundIcon, 
  BrainCircuitIcon,
  EarIcon, 
  EyeIcon, 
  CameraIcon, 
  BookOpenCheckIcon,
  LayoutGridIcon,
} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const useStaggeredAnimation = (count: number, delayIncrement = 100, trigger: boolean) => {
  const [visibleItems, setVisibleItems] = useState(Array(count).fill(false));

  useEffect(() => {
    if (trigger) {
      const timers = Array.from({ length: count }, (_, i) =>
        setTimeout(() => {
          setVisibleItems(prev => {
            const newVisible = [...prev];
            newVisible[i] = true;
            return newVisible;
          });
        }, (i + 1) * delayIncrement)
      );
      return () => timers.forEach(clearTimeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, delayIncrement, trigger]);

  return visibleItems;
};


export default function LandingPage() {
  const { currentUser, logout, loading: authLoading } = useAuth();

  const features = [
    {
      icon: <Wand2Icon className="w-10 h-10 mb-4 text-primary" />,
      title: "AI-Powered Trip Planner",
      description: "Hyper-personalized itineraries! Define destination, dates, budget, mood, and even your Travel DNA. Our AI Guardian crafts detailed plans, fusing preferences with weather, risk, and visa awareness.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "intelligent itinerary generation" 
    },
    {
      icon: <TrendingUpIcon className="w-10 h-10 mb-4 text-accent" />, 
      title: "Smart Price Suite",
      description: "Track flight/hotel prices, get AI advice on when to book, and view illustrative price forecast graphs to make informed, budget-conscious decisions.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai price analysis chart"
    },
    {
      icon: <BrainCircuitIcon className="w-10 h-10 mb-4 text-primary" />,
      title: "Discover Your Travel DNA",
      description: "Our Adventure Quiz uncovers your unique travel persona. This 'Travel DNA' empowers Aura AI to personalize all future travel suggestions and plans for you.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai travel preferences quiz"
    },
    {
      icon: <MessageSquareHeartIcon className="w-10 h-10 mb-4 text-accent" />,
      title: "Aura AI: Predictive Fusion Engine",
      description: "Converse with Aura AI using natural language! It fuses your Travel DNA, search history, and current desires to predict and suggest ideal trip bundles.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "conversational ai travel chat"
    },
    {
      icon: <UsersRoundIcon className="w-10 h-10 mb-4 text-primary" />, 
      title: "Neural Sync for Group Planning",
      description: "Input companion preferences and let AI generate a 'Group Sync Report.' Get insights and suggestions to harmonize the trip for everyone.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai group travel collaboration"
    },
    {
      icon: <BookOpenCheckIcon className="w-10 h-10 mb-4 text-accent" />,
      title: "GPT Travel Memory Archive",
      description: "Let Aura AI craft evocative memory snippets from your saved adventures. Revisit, cherish, and build your generational travel diary.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai travel journal diary"
    },
    {
      icon: <ShieldCheckIcon className="w-10 h-10 mb-4 text-primary" />,
      title: "AI Guardian (Risk, Visa, Weather)",
      description: "Our AI incorporates general awareness of travel risks, visa reminders, and typical weather patterns into your trip plans for a safer, smoother journey.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "travel safety shield"
    },
    {
      icon: <EyeIcon className="w-10 h-10 mb-4 text-accent" />,
      title: "AR/VR Destination Preview (Conceptual)",
      description: "Get a conceptual glimpse of your destination with immersive AR/VR previews, bringing your travel dreams closer to reality before you book.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "virtual reality travel"
    },
     {
      icon: <EarIcon className="w-10 h-10 mb-4 text-primary" />,
      title: "Zero-UI Conversational Planning",
      description: "Experience a seamless, chat-first trip planning flow. Converse naturally with Aura AI, minimizing form interaction for an intuitive journey.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "voice assistant travel"
    },
     {
      icon: <CameraIcon className="w-10 h-10 mb-4 text-accent" />,
      title: "AI-Enhanced Image Generation",
      description: "Visualize your trip! AI generates representative images for destinations and hotels, making your planned itineraries more vivid and inspiring.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai generated travel image"
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

  const heroCarouselImages = [
    { src: "https://placehold.co/1200x678.png", alt: "AI visualization of a travel planning app on a tablet", aiHint: "futuristic ai travel" },
    { src: "https://placehold.co/1200x675.png", alt: "Futuristic Travel Interface Mockup", aiHint: "digital travel interface" },
    { src: "https://placehold.co/1200x675.png", alt: "Digital World Map with Glowing Connections", aiHint: "global travel network" },
    { src: "https://placehold.co/1200x675.png", alt: "Conceptual Image of AI Assisting in Travel Planning", aiHint: "ai assisted planning" },
  ];

  const [heroVisible, setHeroVisible] = useState(false);
  const [featuresSectionVisible, setFeaturesSectionVisible] = useState(false);
  const [whyChooseUsSectionVisible, setWhyChooseUsSectionVisible] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);

  const whyChooseUsListVisible = useStaggeredAnimation(whyChooseUsPoints.length, 100, whyChooseUsSectionVisible);
  const featureCardsVisible = useStaggeredAnimation(features.length, 150, featuresSectionVisible);


  useEffect(() => {
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
  }, []);

  const glassCardClasses = "glass-card hover:border-primary/40";

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
            <Link href="#features" className="text-sm font-medium text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5">
              <ListChecksIcon className="w-4 h-4" /> Features
            </Link>
            <Link href="#why-us" className="text-sm font-medium text-slate-200 hover:text-primary transition-colors flex items-center gap-1.5">
              <HeartIcon className="w-4 h-4" /> Why Us 
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
                      <AvatarFallback className="bg-muted/50">
                        <UserIcon className="h-5 w-5 text-foreground/80" />
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
                     <Link href="/planner" className="cursor-pointer focus:bg-accent/20 focus:text-accent-foreground">
                        <LayoutGridIcon className="mr-2 h-4 w-4" />
                        Go to App
                     </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="cursor-pointer focus:bg-destructive/20 focus:text-destructive-foreground">
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "hidden sm:inline-flex items-center glass-interactive" 
                  )}
                >
                  <LogInIcon className="mr-1 h-4 w-4" /> Login
                </Link>
                <Link
                  href="/login"
                  aria-label="Login"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "sm:hidden text-primary hover:bg-primary/10"
                  )}
                >
                  <LogInIcon />
                </Link>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "hidden sm:inline-flex items-center shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
                  )}
                >
                  <UserPlusIcon className="mr-1 h-4 w-4" /> Sign Up
                </Link>
                 <Link
                  href="/signup"
                  aria-label="Sign Up"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "sm:hidden text-primary hover:bg-primary/10"
                  )}
                >
                  <UserPlusIcon />
                </Link>
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
                "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6 transition-all duration-700 ease-out",
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
              BudgetRoam leverages cutting-edge AI to craft hyper-personalized trips, track prices, offer predictive insights, and even sync group plans, all tailored to your unique Travel DNA. Let Aura AI be your smart travel companion!
            </p>
            <Button
              asChild
              size="lg"
              className={cn(
                "text-lg px-8 py-6 group transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-primary/50 hover:scale-105 active:scale-100",
                "bg-primary hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/30",
                heroVisible ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-10'
              )}
            >
              <Link href={currentUser ? "/planner" : "/signup"}>
                <SparklesIcon className="w-5 h-5 mr-2 transition-transform group-hover:animate-pulse" />
                {currentUser ? "Plan New Trip" : "Get Started Free"}
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <div
              className={cn(
                "mt-16 relative max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border-4 border-card/50 transition-all duration-1000 ease-out",
                heroVisible ? 'opacity-100 scale-100 delay-500' : 'opacity-0 scale-90'
              )}
            >
              <Carousel
                opts={{ loop: true, align: "start" }}
                className="w-full"
              >
                <CarouselContent>
                  {heroCarouselImages.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-video relative">
                        <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            className="object-cover rounded-lg"
                            data-ai-hint={image.aiHint}
                            priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white bg-black/30 hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-primary" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white bg-black/30 hover:bg-primary/80 focus-visible:ring-2 focus-visible:ring-primary" />
              </Carousel>
            </div>
          </div>
        </section>

        <section id="features" className={cn("py-16 md:py-24 transition-opacity duration-1000", featuresSectionVisible ? 'opacity-100' : 'opacity-0')}>
          <div className="container mx-auto px-4">
            <h2 className={cn("text-3xl sm:text-4xl font-bold text-center text-white mb-4 transition-all duration-700 ease-out", featuresSectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5')}>Explore Our Cutting-Edge AI Travel Features</h2>
            <p className={cn("text-lg text-slate-200 dark:text-muted-foreground text-center mb-12 max-w-xl mx-auto transition-all duration-700 ease-out", featuresSectionVisible ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 translate-y-5')}>
              Discover how BudgetRoam's AI makes travel planning smarter, easier, and more personalized than ever.
            </p>
            <Carousel
              opts={{
                align: "start",
                loop: features.length > 2, // Adjusted to loop if more than 2, can be 3 for wider screens
              }}
              className="w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {features.map((feature, index) => (
                  <CarouselItem key={index} className={cn(
                      "pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 transition-all duration-500 ease-out", // Ensure responsive basis
                      featureCardsVisible[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                    )}
                  >
                    <div className="p-1 h-full">
                      <Card
                        className={cn(
                          glassCardClasses, 
                          "hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.03] transition-all duration-300 flex flex-col h-full transform"
                        )}
                      >
                        <CardHeader className="items-center text-center">
                          {feature.icon}
                          <CardTitle className="text-xl text-card-foreground">{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow text-center">
                          <div className="relative aspect-video w-full rounded-md overflow-hidden mb-4 border border-border/30 group">
                              <Image
                                  src={feature.imgSrc}
                                  alt={feature.title}
                                  fill
                                  className="object-cover rounded-md group-hover:scale-110 transition-transform duration-300"
                                  data-ai-hint={feature.aiHint}
                              />
                          </div>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
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
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
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
                      <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3 mt-0.5 shrink-0" />
                      <span className="text-slate-200 dark:text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn("relative aspect-square max-w-md mx-auto md:max-w-none transition-all duration-700 ease-out",  whyChooseUsSectionVisible ? "opacity-100 scale-100 delay-200" : "opacity-0 scale-90")}>
                <Image
                    src="https://placehold.co/600x600.png"
                    alt="Diverse travelers enjoying AI-planned trips"
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
            <h2 className={cn("text-3xl sm:text-4xl font-bold text-white mb-6 flex items-center justify-center transition-all duration-700 ease-out", finalCtaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
              <SparklesIcon className="w-10 h-10 mr-3 text-primary animate-pulse" />
              Ready to Redefine Your Travels?
            </h2>
            <p className={cn("text-lg text-slate-200 dark:text-muted-foreground mb-10 max-w-xl mx-auto transition-all duration-700 ease-out", finalCtaVisible ? "opacity-100 translate-y-0 delay-100" : "opacity-0 translate-y-10")}>
              Join thousands of savvy travelers leveraging BudgetRoam AI to plan their next extraordinary adventure.
            </p>
            <Button
                asChild
                size="lg"
                className={cn(
                    "text-lg px-10 py-6 group transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-primary/40 shadow-md shadow-primary/30 hover:scale-105 active:scale-100",
                    "bg-primary hover:bg-primary/90 focus-visible:ring-4 focus-visible:ring-primary/30",
                    finalCtaVisible ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-10"
                )}
            >
              <Link href={currentUser ? "/planner" : "/signup"}>
                {currentUser ? "Start Planning Now" : "Unlock Your AI Travel Assistant"}
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className={cn("py-8 backdrop-blur-sm border-t border-border/30 z-10", "bg-[hsl(205_80%_85%_/_0.7)] dark:bg-black/50")}>
        <div className="container mx-auto px-4 text-center text-foreground dark:text-muted-foreground">
          <div className="flex justify-center mb-2">
            <AppLogo />
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} BudgetRoam AI. All rights reserved.
          </p>
          <p className="text-xs mt-1">Your smart companion for budget-friendly, AI-powered adventures.</p>
        </div>
      </footer>
    </div>
  );
}
