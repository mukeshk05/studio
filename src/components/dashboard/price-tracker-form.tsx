
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trackPrice, type PriceTrackerOutput } from "@/ai/flows/price-tracker";
import React from "react";
import { Loader2, BellPlus, Plane, Hotel, DollarSign, Tag, CalendarDays, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useAddTrackedItem } from "@/lib/firestoreHooks";
import { cn } from "@/lib/utils";
import type { PriceTrackerEntry } from "@/lib/types";

const formSchema = z.object({
  itemType: z.enum(["flight", "hotel"], {
    required_error: "You need to select an item type.",
  }),
  itemName: z.string().min(2, "Item name/hotel name must be at least 2 characters."),
  originCity: z.string().optional(),
  destination: z.string().optional(), 
  targetPrice: z.coerce.number().positive("Target price must be a positive number."),
  currentPrice: z.coerce.number().positive("Current price must be a positive number."),
  travelDates: z.string().optional(),
});

const prominentButtonClasses = "w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-accent hover:to-primary focus-visible:ring-4 focus-visible:ring-primary/40 transform transition-all duration-300 ease-out hover:scale-[1.02] active:scale-100";

export function PriceTrackerForm() {
  const { toast } = useToast();
  const [aiAlert, setAiAlert] = React.useState<PriceTrackerOutput | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const addTrackedItemMutation = useAddTrackedItem();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: "",
      originCity: "",
      destination: "",
      travelDates: "",
    },
  });

  const itemType = form.watch("itemType");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) {
      toast({ title: "Authentication Required", description: "Please log in to add items to the tracker.", variant: "destructive" });
      return;
    }
    if (itemType === "hotel" && !values.destination?.trim()) {
      form.setError("destination", { type: "manual", message: "Hotel location/city is required." });
      return;
    }
     if (itemType === "flight" && !values.destination?.trim()) {
      form.setError("destination", { type: "manual", message: "Flight destination city is required." });
      return;
    }
    if (itemType === "flight" && !values.originCity?.trim()) {
      form.setError("originCity", { type: "manual", message: "Flight origin city is required." });
      return;
    }


    setAiAlert(null);
    try {
      const newItemData: Partial<Omit<PriceTrackerEntry, 'id'>> = {
        itemType: values.itemType,
        itemName: values.itemName,
        targetPrice: values.targetPrice,
        currentPrice: values.currentPrice,
      };

      if (values.itemType === 'flight' && values.originCity) newItemData.originCity = values.originCity;
      if (values.destination) newItemData.destination = values.destination;
      if (values.travelDates) newItemData.travelDates = values.travelDates;

      await addTrackedItemMutation.mutateAsync(
        newItemData as Omit<PriceTrackerEntry, 'id' | 'lastChecked' | 'aiAdvice' | 'createdAt' | 'alertStatus' | 'priceForecast'>
      );

      toast({
        title: "Price Tracker Added",
        description: `${values.itemName} is now being tracked.`,
      });
      form.reset({
          itemName: "",
          originCity: "",
          destination: "",
          travelDates: "",
          itemType: values.itemType, // Keep item type selected
      });

    } catch (error: any) {
      console.error("Error tracking price:", error);
      toast({
        title: "Error",
        description: error.message || "Could not add item to tracker. Please try again.",
        variant: "destructive",
      });
    }
  }

  const isSubmitting = form.formState.isSubmitting || addTrackedItemMutation.isPending;

  return (
    <Card className={cn("w-full mb-6", "glass-card", "border-primary/20")}>
      <CardHeader>
        <CardTitle className="flex items-center text-xl text-card-foreground">
          <BellPlus className="w-6 h-6 mr-2 text-accent" />
          Add Item to Price Tracker
        </CardTitle>
        <CardDescription className="text-muted-foreground">Get alerts when prices drop for your desired flights or hotels.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-card-foreground/90">Item Type</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("destination", ""); 
                    form.setValue("originCity", "");
                  }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50">
                        <SelectValue placeholder="Select item type (flight or hotel)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-pane border-border/50">
                      <SelectItem value="flight"><Plane className="inline-block mr-2 h-4 w-4" />Flight</SelectItem>
                      <SelectItem value="hotel"><Hotel className="inline-block mr-2 h-4 w-4" />Hotel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-card-foreground/90">
                    <Tag className="w-4 h-4 mr-2" />
                    {itemType === 'hotel' ? 'Hotel Name' : 'Flight Name/Route'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={itemType === 'hotel' ? "e.g., Grand Hyatt Hotel" : "e.g., Flight AA123, BudgetAir X100"} 
                      {...field} 
                      className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {itemType === "flight" && (
               <FormField
                control={form.control}
                name="originCity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-card-foreground/90">
                      <MapPin className="w-4 h-4 mr-2" />
                      Origin City *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., New York, USA" 
                        {...field} 
                        className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {itemType && (
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-card-foreground/90">
                      <MapPin className="w-4 h-4 mr-2" />
                      {itemType === 'hotel' ? 'Hotel Location/City *' : 'Flight Destination City *'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={itemType === 'hotel' ? "e.g., Paris, France" : "e.g., Tokyo, Japan"} 
                        {...field} 
                        className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

             <FormField
              control={form.control}
              name="travelDates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-card-foreground/90"><CalendarDays className="w-4 h-4 mr-2" />Travel Dates (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dec 10-17, Next Summer, Mid-July" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-card-foreground/90"><DollarSign className="w-4 h-4 mr-2" />Target Price (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 300" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-card-foreground/90"><DollarSign className="w-4 h-4 mr-2" />Current Price (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 350" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className={cn(prominentButtonClasses)}
              disabled={isSubmitting || !currentUser || authLoading}
            >
              {isSubmitting || authLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BellPlus className="mr-2 h-4 w-4" />
              )}
              {authLoading ? 'Authenticating...' : (isSubmitting ? 'Adding...' : 'Add to Tracker')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
