
"use client";

import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/layout/app-logo';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  NavigationIcon, 
  TrendingUpIcon, 
  BrainCircuitIcon, 
  UsersIcon, 
  LightbulbIcon,
  ListChecksIcon,
  HeartIcon,
  LogInIcon,
  Wand2Icon,
  CheckCircleIcon,
  BarChart3Icon, 
  UsersRoundIcon, 
  BrainIcon, 
  MessageSquareTextIcon,
  NotebookTextIcon,
  AppWindowIcon
} from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

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
  const features = [
    {
      icon: <Wand2Icon className="w-10 h-10 mb-4" />, // Updated icon
      title: "AI-Powered Trip Planner",
      description: "Personalized itineraries in seconds! Define your destination, dates, budget, mood, and Travel DNA. Our AI crafts detailed daily plans and hotel options, considering weather and risks.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "intelligent itinerary generation"
    },
    {
      icon: <BarChart3Icon className="w-10 h-10 mb-4" />, // Updated icon
      title: "Smart Price Suite",
      description: "Never miss a deal. Track flight/hotel prices, get AI advice on when to book, and view illustrative price forecasts to make informed decisions.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai price analysis chart"
    },
    {
      icon: <BrainIcon className="w-10 h-10 mb-4" />,
      title: "Discover Your Travel DNA",
      description: "Take our Adventure Quiz to uncover your unique travel persona. This helps Aura AI personalize all your future travel suggestions and trip plans!",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai travel preferences quiz"
    },
    {
      icon: <MessageSquareTextIcon className="w-10 h-10 mb-4" />, // Updated icon
      title: "Aura AI: Natural Language Trip Search",
      description: "Ask Aura for trip ideas using natural language! Get personalized trip bundles based on your profile and search history.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "conversational ai travel chat"
    },
    {
      icon: <UsersRoundIcon className="w-10 h-10 mb-4" />,
      title: "Effortless Group Planning",
      description: "Sync trip plans with your group's preferences using AI insights to ensure everyone has a great time.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai group travel collaboration"
    },
    {
      icon: <NotebookTextIcon className="w-10 h-10 mb-4" />,
      title: "AI Trip Memory Archive",
      description: "Let AI craft nostalgic memory snippets from your saved adventures. Revisit and cherish your travel moments.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "ai travel journal diary"
    }
  ];

  const whyChooseUsPoints = [
    "AI-Personalized to Your Travel DNA: Itineraries and bundles tailored to *you*.",
    "Budget-Conscious Planning: Maximize your experiences without breaking the bank.",
    "Intelligent Tools: Price tracking, AI advice, packing lists, and group sync.",
    "Modern & Intuitive: A seamless, enjoyable planning experience with a ChatGPT-like interface.",
    "All-in-One Dashboard: Your trips, alerts, and Aura AI in one place."
  ];

  const heroCarouselImages = [
    { src: "https://placehold.co/1200x678.png", alt: "AI visualization of a travel planning app on a tablet", aiHint: "ai visualization travel app tablet" },
    { src: "https://placehold.co/1200x675.png", alt: "Futuristic Travel Interface Mockup", aiHint: "futuristic travel interface" },
    { src: "https://placehold.co/1200x675.png", alt: "Digital World Map with Glowing Connections", aiHint: "digital world map" },
    { src: "https://placehold.co/1200x675.png", alt: "Conceptual Image of AI Assisting in Travel Planning", aiHint: "ai assisted planning" },
  ];

  const [heroVisible, setHeroVisible] = useState(false);
  const [featuresSectionVisible, setFeaturesSectionVisible] = useState(false);
  const [whyChooseUsSectionVisible, setWhyChooseUsSectionVisible] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);
  
  const whyChooseUsListVisible = useStaggeredAnimation(whyChooseUsPoints.length, 100, whyChooseUsSectionVisible);
  const featureCardsVisible = useStaggeredAnimation(features.length, 150, featuresSectionVisible);


  useEffect(() => {
    // Trigger animations after mount
    const heroTimer = setTimeout(() => setHeroVisible(true), 50);
    const featuresTimer = setTimeout(() => setFeaturesSectionVisible(true), 250); // Delay features section
    const whyUsTimer = setTimeout(() => setWhyChooseUsSectionVisible(true), 450); // Delay why-us section
    const ctaTimer = setTimeout(() => setFinalCtaVisible(true), 650); // Delay final CTA

    return () => {
      clearTimeout(heroTimer);
      clearTimeout(featuresTimer);
      clearTimeout(whyUsTimer);
      clearTimeout(ctaTimer);
    };
  }, []);

  const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/60";

  return (
    <div className="flex flex-col min-h-screen text-foreground overflow-x-hidden relative">
      {/* Background Image and Overlay */}
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
            <Button asChild variant="ghost" className="text-sm text-slate-100 hover:bg-primary/10 hover:text-primary">
              <Link href="/planner" className="flex items-center gap-1.5"><LogInIcon className="w-4 h-4" /> App</Link>
            </Button>
             <Button asChild className={cn("text-sm hidden sm:inline-flex transform transition-transform hover:scale-105 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40")}>
              <Link href="/planner" className="flex items-center gap-1.5">
                <LogInIcon className="w-4 h-4" /> Get Started
              </Link>
            </Button>
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
              Plan Your Next Adventure with <span className="text-primary">AI-Powered</span> Precision
            </h1>
            <p 
              className={cn(
                "text-lg sm:text-xl text-slate-200 dark:text-muted-foreground mb-10 max-w-3xl mx-auto transition-all duration-700 ease-out",
                heroVisible ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 translate-y-10'
              )}
            >
              BudgetRoam uses cutting-edge AI to craft personalized trips, track prices, and offer smart travel insights, all tailored to your unique style and budget. Discover your Travel DNA and let Aura AI guide you!
            </p>
            <Button 
              asChild 
              size="lg" 
              className={cn(
                "text-lg px-8 py-6 group transform transition-all duration-700 ease-out hover:shadow-lg hover:shadow-primary/50 hover:scale-105",
                heroVisible ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-10'
              )}
            >
              <Link href="/planner">
                <SparklesIcon className="w-5 h-5 mr-2 transition-transform group-hover:animate-pulse" />
                Start Your AI-Powered Journey
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
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white bg-black/30 hover:bg-primary/80" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white bg-black/30 hover:bg-primary/80" />
              </Carousel>
            </div>
          </div>
        </section>

        <section id="features" className={cn("py-16 md:py-24 transition-opacity duration-1000", featuresSectionVisible ? 'opacity-100' : 'opacity-0')}>
          <div className="container mx-auto px-4">
            <h2 className={cn("text-3xl sm:text-4xl font-bold text-center text-white mb-4 transition-all duration-700 ease-out", featuresSectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5')}>Intelligent Features for Smarter Travel</h2>
            <p className={cn("text-lg text-slate-200 dark:text-muted-foreground text-center mb-12 max-w-xl mx-auto transition-all duration-700 ease-out", featuresSectionVisible ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 translate-y-5')}>
              Leverage the power of AI to simplify and enhance every aspect of your travel planning.
            </p>
            <Carousel
              opts={{
                align: "start",
                loop: features.length > 2, // Loop only if enough items for it to make sense
              }}
              className="w-full max-w-xs sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {features.map((feature, index) => (
                  <CarouselItem key={index} className={cn(
                      "pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 transition-all duration-500 ease-out",
                      featureCardsVisible[index] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                    )}
                  >
                    <div className="p-1 h-full">
                      <Card 
                        className={cn(
                          glassCardClasses,
                          "hover:shadow-primary/30 hover:scale-[1.03] transition-all duration-300 flex flex-col h-full transform"
                        )}
                      >
                        <CardHeader className="items-center text-center">
                          {React.cloneElement(feature.icon, { className: cn(feature.icon.props.className, "text-primary") })}
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
              <CarouselPrevious className="ml-8 sm:ml-0 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground" />
              <CarouselNext className="mr-8 sm:mr-0 text-foreground bg-background/70 hover:bg-accent hover:text-accent-foreground" />
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
                  We believe amazing travel experiences shouldn't break the bank. BudgetRoam is designed to be your intelligent partner, making dream vacations accessible and stress-free.
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
                    className="object-cover rounded-xl shadow-2xl shadow-primary/20 transform hover:scale-105 transition-transform duration-500 ease-out"
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
              Ready to Explore the World, Smarter?
            </h2>
            <p className={cn("text-lg text-slate-200 dark:text-muted-foreground mb-10 max-w-xl mx-auto transition-all duration-700 ease-out", finalCtaVisible ? "opacity-100 translate-y-0 delay-100" : "opacity-0 translate-y-10")}>
              Join thousands of savvy travelers planning their next adventure with BudgetRoam AI.
            </p>
            <Button 
                asChild 
                size="lg" 
                className={cn(
                    "text-lg px-10 py-6 group transform transition-all duration-700 ease-out hover:shadow-xl hover:shadow-primary/40 shadow-md shadow-primary/30 hover:scale-105", 
                    finalCtaVisible ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-10"
                )}
            >
              <Link href="/planner">
                Plan Your First AI Trip for Free
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-[hsl(205_80%_85%_/_0.7)] dark:bg-black/50 backdrop-blur-sm border-t border-border/30 z-10">
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
    

    