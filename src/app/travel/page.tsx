
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppLogo } from '@/components/layout/app-logo';
import { cn } from '@/lib/utils';
import { Search, Plane, Hotel, Compass, Briefcase, Camera } from 'lucide-react';

const glassCardClasses = "glass-card hover:border-primary/40 bg-card/80 dark:bg-card/50 backdrop-blur-lg";
const glassPaneClasses = "bg-background/60 dark:bg-background/50 backdrop-blur-xl"; // Removed extra border for cleaner look on this page header

const exploreCategories = [
  { name: "Flights", icon: <Plane className="w-5 h-5" />, href: "/planner" },
  { name: "Hotels", icon: <Hotel className="w-5 h-5" />, href: "#" }, // Placeholder
  { name: "Things to do", icon: <Compass className="w-5 h-5" />, href: "#" },
  { name: "Packages", icon: <Briefcase className="w-5 h-5" />, href: "#" },
];

const popularDestinations = [
  { name: "Paris", country: "France", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "paris eiffel tower", description: "Iconic landmarks, art, and romance." },
  { name: "Rome", country: "Italy", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "rome colosseum", description: "Ancient history and delicious cuisine." },
  { name: "Tokyo", country: "Japan", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "tokyo cityscape modern", description: "Futuristic cityscapes and rich traditions." },
  { name: "Bali", country: "Indonesia", imageSrc: "https://placehold.co/600x400.png", dataAiHint: "bali beach tropical", description: "Tropical beaches and serene temples." },
];

export default function TravelPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className={cn("sticky top-0 z-40 w-full border-b border-border/30", glassPaneClasses)}>
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          <div className="relative w-full max-w-lg hidden md:block">
            <SearchInput initialSearchTerm={searchTerm} onSearch={setSearchTerm} />
          </div>
          <div className="flex items-center gap-2">
            {/* Placeholder for User Avatar/Login - adapt from landing page if needed */}
            <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:bg-accent/10">
              <Search className="w-5 h-5" />
            </Button>
             {/* Example: Link to Dashboard if user is logged in - adapt AuthContext */}
            <Button variant="outline" size="sm" asChild className="hidden sm:flex glass-interactive">
                <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
            Where to next?
          </h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Discover flights, hotels, vacation packages, and things to do. Your journey starts here.
          </p>
          <div className={cn("max-w-2xl mx-auto p-3 rounded-xl shadow-xl", glassCardClasses, "border-primary/20")}>
            <SearchInput initialSearchTerm={searchTerm} onSearch={setSearchTerm} placeholder="Search destinations, hotels, or activities..." />
          </div>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 rounded-xl", glassCardClasses, "border-primary/10")}>
            {exploreCategories.map((category) => (
              <Link key={category.name} href={category.href} passHref>
                <Button
                  variant="ghost"
                  className="w-full h-24 sm:h-28 flex flex-col items-center justify-center p-2 text-center transition-all duration-200 ease-in-out hover:bg-primary/10 group rounded-lg"
                >
                  <div className="mb-1.5 text-primary group-hover:text-accent transition-colors">
                    {React.cloneElement(category.icon, { className: cn(category.icon.props.className, "w-7 h-7 sm:w-8 sm:h-8") })}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-card-foreground group-hover:text-accent transition-colors">{category.name}</span>
                </Button>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-12 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">Popular Destinations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularDestinations.map((dest) => (
              <Card key={dest.name} className={cn(glassCardClasses, "overflow-hidden transform hover:scale-[1.03] transition-transform duration-300 ease-out shadow-lg hover:shadow-primary/30")}>
                <div className="relative w-full aspect-[16/10]">
                  <Image
                    src={dest.imageSrc}
                    alt={dest.name}
                    fill
                    className="object-cover"
                    data-ai-hint={dest.dataAiHint}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg text-card-foreground">{dest.name}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">{dest.country}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">{dest.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        <section className="animate-fade-in-up" style={{animationDelay: '0.6s'}}>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-6">More to Explore (Conceptual)</h2>
            <div className={cn("p-6 text-center text-muted-foreground rounded-xl", glassCardClasses, "border-primary/10")}>
                <Camera className="w-12 h-12 mx-auto mb-3 text-primary/70"/>
                <p>Imagine personalized suggestions appearing here based on your recent searches or saved trips! </p>
                <p className="text-xs mt-1">This section would dynamically update with AI recommendations.</p>
            </div>
        </section>

      </main>

      <footer className={cn("py-6 border-t border-border/30 mt-auto", glassPaneClasses)}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} BudgetRoam. Explore the world your way.
          </p>
        </div>
      </footer>
    </div>
  );
}

interface SearchInputProps {
  initialSearchTerm?: string;
  onSearch?: (term: string) => void;
  placeholder?: string;
}
function SearchInput({ initialSearchTerm = '', onSearch, placeholder = "Search destinations, hotels, flights..."}: SearchInputProps) {
  const [term, setTerm] = useState(initialSearchTerm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(term);
    // Placeholder for actual search functionality
    console.log("Conceptual search submitted:", term);
    // In a real app, this would trigger navigation or API calls
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-2.5 h-12 text-base bg-input/70 border-border/50 focus:bg-input/90 dark:bg-input/50 rounded-full shadow-inner focus:ring-2 focus:ring-primary/50"
      />
      <button type="submit" className="hidden">Search</button>
    </form>
  );
}

    