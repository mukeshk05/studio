
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/layout/app-logo';
import { ArrowRightIcon, Wand2Icon, BellRingIcon, BadgePercentIcon, ClipboardListIcon, CheckCircleIcon, SparklesIcon, NavigationIcon } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Simple utility for staggered animations.
const useStaggeredAnimation = (count: number, delayIncrement = 100) => {
  const [visibleItems, setVisibleItems] = useState(Array(count).fill(false));

  useEffect(() => {
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
  }, [count, delayIncrement]);

  return visibleItems;
};


export default function LandingPage() {
  const features = [
    {
      icon: <Wand2Icon className="w-10 h-10 text-primary mb-4" />,
      title: "AI-Powered Trip Planning",
      description: "Enter your destination, dates, and budget. Our AI crafts personalized itineraries in seconds, complete with daily activities and options.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "travel planning map"
    },
    {
      icon: <BellRingIcon className="w-10 h-10 text-accent mb-4" />,
      title: "Smart Price Tracker",
      description: "Never miss a deal. Track flight and hotel prices, and get alerts when prices drop below your target.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "price alert notification"
    },
    {
      icon: <BadgePercentIcon className="w-10 h-10 text-primary mb-4" />,
      title: "AI Price Advisor",
      description: "Get intelligent advice on your tracked items. Is your target price realistic? Is it a good time to book? Our AI helps you decide.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "financial graph chart"
    },
    {
      icon: <ClipboardListIcon className="w-10 h-10 text-accent mb-4" />,
      title: "Daily Travel Tips",
      description: "Start your day with a fresh travel tip from our AI, covering everything from packing hacks to cultural etiquette.",
      imgSrc: "https://placehold.co/600x400.png",
      aiHint: "travel journal guide"
    }
  ];

  const whyChooseUsPoints = [
    "Budget-friendly focus: Tailored suggestions to maximize your budget.",
    "Time-saving automation: Let AI handle the heavy lifting of research.",
    "Personalized experience: Itineraries and advice that match your preferences.",
    "Modern & Intuitive UI: Easy to navigate and enjoyable to use.",
    "All-in-one dashboard: Manage saved trips and price alerts in one place."
  ];

  const [heroVisible, setHeroVisible] = useState(false);
  const featureCardsVisible = useStaggeredAnimation(features.length, 150);
  const whyChooseUsVisible = useStaggeredAnimation(whyChooseUsPoints.length, 100);
  const [whyChooseUsSectionVisible, setWhyChooseUsSectionVisible] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);


  useEffect(() => {
    setHeroVisible(true);
    const sectionTimer1 = setTimeout(() => setWhyChooseUsSectionVisible(true), 200);
    const sectionTimer2 = setTimeout(() => setFinalCtaVisible(true), 400);
    return () => {
      clearTimeout(sectionTimer1);
      clearTimeout(sectionTimer2);
    };
  }, []);

  const glassCardClasses = "glass-card border-primary/20 hover:border-primary/40"; // Updated for new theme

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-pane">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <AppLogo />
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#why-us" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Why Us
            </Link>
            <Button asChild variant="ghost" className="text-sm hover:bg-primary/10 hover:text-primary">
              <Link href="/planner">App</Link>
            </Button>
             <Button asChild className={cn("text-sm hidden sm:inline-flex transform transition-transform hover:scale-105 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40")}>
              <Link href="/planner">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="py-20 md:py-32 text-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
          <div className="container mx-auto px-4">
            <h1 
              className={cn(
                "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 transition-all duration-700 ease-out",
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              )}
            >
              Travel Smarter, Not Harder with <span className="text-primary">BudgetRoam</span>
            </h1>
            <p 
              className={cn(
                "text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto transition-all duration-700 ease-out delay-200",
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              )}
            >
              Your AI-powered companion for planning unforgettable trips that fit your budget.
              Discover personalized itineraries, track prices, and get expert advice.
            </p>
            <Button 
              asChild 
              size="lg" 
              className={cn(
                "text-lg px-8 py-6 group transform transition-all duration-700 ease-out delay-300 hover:shadow-lg hover:shadow-primary/50 hover:scale-105",
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              )}
            >
              <Link href="/planner">
                <NavigationIcon className="w-5 h-5 mr-2" />
                Start Planning Your Adventure
              </Link>
            </Button>
            <div 
              className={cn(
                "mt-16 relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden border-4 border-card/50 transition-all duration-1000 ease-out delay-500",
                heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              )}
            >
                <Image 
                    src="https://placehold.co/1200x675.png" 
                    alt="BudgetRoam App Screenshot Placeholder" 
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="travel app interface"
                    priority
                    className="rounded-lg"
                />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className={cn("text-3xl sm:text-4xl font-bold text-center text-foreground mb-4 transition-opacity duration-700", heroVisible ? 'opacity-100' : 'opacity-0')}>Everything You Need to Roam on a Budget</h2>
            <p className={cn("text-lg text-muted-foreground text-center mb-12 max-w-xl mx-auto transition-opacity duration-700 delay-200", heroVisible ? 'opacity-100' : 'opacity-0')}>
              BudgetRoam leverages AI to simplify every step of your travel planning.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className={cn(
                    glassCardClasses,
                    "hover:shadow-primary/30 hover:scale-105 transition-all duration-300 flex flex-col transform",
                    featureCardsVisible[index] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  )}
                >
                  <CardHeader className="items-center text-center">
                    {React.cloneElement(feature.icon, { className: cn(feature.icon.props.className, feature.icon.props.className.includes('text-accent') ? 'text-accent' : 'text-primary') })}
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow text-center">
                    <div className="relative aspect-video w-full rounded-md overflow-hidden mb-4 border border-border/30 group">
                        <Image 
                            src={feature.imgSrc} 
                            alt={feature.title} 
                            layout="fill" 
                            objectFit="cover" 
                            data-ai-hint={feature.aiHint} 
                            className="rounded-md group-hover:scale-110 transition-transform duration-300"
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section id="why-us" className={cn("py-16 md:py-24 bg-gradient-to-r from-accent/5 via-background to-primary/5 transition-opacity duration-1000", whyChooseUsSectionVisible ? 'opacity-100' : 'opacity-0')}>
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                  Why Choose <span className="text-primary">BudgetRoam</span>?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  We believe amazing travel experiences shouldn't break the bank. BudgetRoam is designed to be your intelligent partner, making dream vacations accessible and stress-free.
                </p>
                <ul className="space-y-3">
                  {whyChooseUsPoints.map((point, index) => (
                    <li 
                      key={index} 
                      className={cn(
                        "flex items-start transition-all duration-500 ease-out",
                        whyChooseUsVisible[index] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5'
                      )}
                      style={{transitionDelay: `${index * 100}ms`}}
                    >
                      <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative aspect-square max-w-md mx-auto md:max-w-none">
                <Image
                    src="https://placehold.co/600x600.png"
                    alt="Happy traveler using BudgetRoam"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-xl shadow-2xl shadow-primary/20 transform hover:scale-105 transition-transform duration-500 ease-out"
                    data-ai-hint="happy traveler destination"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className={cn("py-20 md:py-28 text-center bg-background transition-opacity duration-1000", finalCtaVisible ? 'opacity-100' : 'opacity-0')}>
          <div className="container mx-auto px-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 flex items-center justify-center">
              <SparklesIcon className="w-10 h-10 mr-3 text-primary animate-pulse" />
              Ready to Explore the World on Your Terms?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              Join thousands of savvy travelers planning their next adventure with BudgetRoam.
            </p>
            <Button asChild size="lg" className="text-lg px-10 py-6 group transform transition-transform hover:scale-105 hover:shadow-xl hover:shadow-primary/40 shadow-md shadow-primary/30">
              <Link href="/planner">
                Plan Your First Trip for Free
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-background border-t border-border/30">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex justify-center mb-2">
            <AppLogo />
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} BudgetRoam. All rights reserved.
          </p>
          <p className="text-xs mt-1">Your smart companion for budget-friendly adventures.</p>
        </div>
      </footer>
    </div>
  );
}
