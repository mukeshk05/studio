
"use client";

import React from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HotelOption, Room } from "@/lib/types";
import { X, Info, ImageIcon as ImageLucide, MapPin, DollarSign, ImageOff, BedDouble, Sparkles, Star, Bath, CheckSquare, Hotel } from 'lucide-react'; // Corrected ImageIcon to ImageLucide if that's the intended import, or just Image if it's a different icon. Assuming 'Image' is more likely for a general image icon.
import { cn } from "@/lib/utils";

type HotelDetailDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  hotel: HotelOption | null;
  destinationName: string;
};

const glassCardClasses = "glass-card";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

function RoomCard({ room }: { room: Room }) {
  const roomImageHint = room.name.toLowerCase().split(/[\s,]+/).slice(0, 2).join(" ");
  return (
    <div className={cn("p-3 rounded-lg mb-3 border border-border/40", innerGlassEffectClasses)}>
      <h4 className="text-md font-semibold text-card-foreground mb-1.5 flex items-center">
        <BedDouble className="w-5 h-5 mr-2 text-primary" />
        {room.name}
      </h4>
      {room.roomImageUri && (
        <div className="relative aspect-video w-full rounded-md overflow-hidden mb-2 border border-border/30 shadow-sm">
          <Image
            src={room.roomImageUri}
            alt={`Image of ${room.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 80vw, 300px"
            data-ai-hint={room.roomImageUri.startsWith('https://placehold.co') ? roomImageHint : undefined}
          />
        </div>
      )}
      {room.description && <p className="text-xs text-muted-foreground mb-1.5">{room.description}</p>}
      {room.features && room.features.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-card-foreground mb-1">Features:</h5>
          <div className="flex flex-wrap gap-1.5">
            {room.features.map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{feature}</Badge>
            ))}
          </div>
        </div>
      )}
      {room.pricePerNight && (
        <p className="text-sm font-semibold text-primary mt-2">
          ${room.pricePerNight.toLocaleString()}/night (est.)
        </p>
      )}
    </div>
  );
}

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
      <DialogContent className={cn(glassCardClasses, "sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 border-primary/30")}>
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 sticky top-0 z-10 bg-card/80 dark:bg-card/50 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div className="flex-grow min-w-0">
              <DialogTitle className="text-xl font-semibold text-foreground truncate" title={hotel.name}>
                <Hotel className="w-6 h-6 mr-2 inline-block text-primary" />
                {hotel.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                in {destinationName}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {hotel.hotelImageUri && (
          <div className="relative aspect-[16/7] w-full max-h-60 sm:max-h-72 border-b border-border/30">
            <Image
              src={hotel.hotelImageUri}
              alt={`Image of ${hotel.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1000px"
              priority
              data-ai-hint={hotel.hotelImageUri.startsWith('https://placehold.co') ? hotelImageHint : undefined}
            />
          </div>
        )}
        {!hotel.hotelImageUri && (
            <div className={cn("h-40 bg-muted/30 flex items-center justify-center text-muted-foreground border-b border-border/30", innerGlassEffectClasses, "rounded-none")}>
                <ImageOff className="w-12 h-12"/>
            </div>
        )}


        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className={cn("grid w-full grid-cols-2 sm:grid-cols-4 mb-4 glass-pane p-1", "border border-border/50")}>
              <TabsTrigger value="details" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <Info className="w-4 h-4" /> Details
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" disabled={!hotel.rooms || hotel.rooms.length === 0}>
                <BedDouble className="w-4 h-4" /> Rooms
              </TabsTrigger>
              <TabsTrigger value="amenities" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md" disabled={!hotel.amenities || hotel.amenities.length === 0}>
                <CheckSquare className="w-4 h-4" /> Amenities
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2 data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                <MapPin className="w-4 h-4" /> Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className={cn(glassCardClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">About {hotel.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{hotel.description}</p>
              <div className="flex items-center text-lg font-semibold text-primary">
                <DollarSign className="w-5 h-5 mr-2" />
                Price: ${hotel.price.toLocaleString()} (for the stay)
              </div>
               {hotel.rating !== undefined && hotel.rating !== null && (
                 <div className="mt-3 flex items-center text-md font-medium text-amber-400">
                    <Star className="w-5 h-5 mr-1.5 fill-amber-400 text-amber-400" />
                    Rating: {hotel.rating.toFixed(1)} / 5.0
                 </div>
                )}
            </TabsContent>

            <TabsContent value="rooms" className={cn(glassCardClasses, "p-4 rounded-md")}>
              <h3 className="text-lg font-semibold text-card-foreground mb-3">Available Rooms</h3>
              {hotel.rooms && hotel.rooms.length > 0 ? (
                <ScrollArea className="max-h-96 pr-3">
                  {hotel.rooms.map((room, idx) => (
                    <RoomCard key={idx} room={room} />
                  ))}
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Room information not available.</p>
              )}
            </TabsContent>

            <TabsContent value="amenities" className={cn(glassCardClasses, "p-4 rounded-md")}>
                <h3 className="text-lg font-semibold text-card-foreground mb-3">Amenities</h3>
                {hotel.amenities && hotel.amenities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {hotel.amenities.map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="text-sm py-1 px-2 border-primary/40 text-primary/90 bg-primary/5 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-accent" />
                            {amenity}
                        </Badge>
                    ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Amenity information not available.</p>
                )}
            </TabsContent>

            <TabsContent value="map" className={cn(glassCardClasses, "p-4 rounded-md")}>
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
                <div className="text-center py-8 text-muted-foreground bg-muted/30 dark:bg-muted/10 p-4 rounded-md">
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
