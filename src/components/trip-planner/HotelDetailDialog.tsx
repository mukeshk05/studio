
"use client";

import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { HotelOption } from "@/lib/types";
import { XIcon, InfoIcon, ImageIcon, MapPinIcon, DollarSignIcon, ImageOffIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type HotelDetailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  hotel: HotelOption | null;
  destinationName: string; // To help with map query
};

const glassEffectClasses = "glass-card"; // From globals.css

export function HotelDetailDialog({ isOpen, onClose, hotel, destinationName }: HotelDetailDialogProps) {
  if (!hotel) return null;

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapQuery = encodeURIComponent(`${hotel.name}, ${destinationName}`);
  const mapEmbedUrl = mapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${mapQuery}`
    : "";
  
  const hotelImageHint = hotel.name.toLowerCase().split(/[\s,]+/).slice(0, 2).join(" ");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={cn(glassEffectClasses, "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">{hotel.name}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Details for your stay at {hotel.name} in {destinationName}.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                <XIcon className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={cn("grid w-full grid-cols-3 mb-4 glass-pane p-1", "border border-border/50")}>
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <InfoIcon className="w-4 h-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <ImageIcon className="w-4 h-4" /> Image
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <MapPinIcon className="w-4 h-4" /> Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className={cn(glassEffectClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">About {hotel.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{hotel.description}</p>
              <div className="flex items-center text-lg font-semibold text-primary">
                <DollarSignIcon className="w-5 h-5 mr-2" />
                Price: ${hotel.price.toLocaleString()} (for the stay)
              </div>
            </TabsContent>

            <TabsContent value="image" className={cn(glassEffectClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Hotel Image</h3>
              <div className="relative aspect-video w-full max-w-xl mx-auto rounded-lg overflow-hidden border border-border/50 shadow-lg">
                {hotel.hotelImageUri && hotel.hotelImageUri !== "" ? (
                  <Image
                    src={hotel.hotelImageUri}
                    alt={`Image of ${hotel.name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 90vw, (max-width: 1200px) 70vw, 50vw"
                    data-ai-hint={hotel.hotelImageUri.startsWith('https://placehold.co') ? hotelImageHint : undefined}
                  />
                ) : (
                  <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center text-muted-foreground">
                    <ImageOffIcon className="w-16 h-16 mb-2" />
                    <p>No image available</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="map" className={cn(glassEffectClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Location of {hotel.name}</h3>
              {mapsApiKey ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/50 shadow-lg">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapEmbedUrl}
                    title={`Map of ${hotel.name} in ${destinationName}`}
                  ></iframe>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 p-4 rounded-md">
                  <p>Google Maps API Key is missing.</p>
                  <p className="text-xs">Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map features.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
