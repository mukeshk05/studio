
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TripInputForm } from "./trip-input-form";
import type { AITripPlannerInput } from "@/ai/flows/ai-trip-planner";
import React from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TripPlannerInputSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlanRequest: (input: AITripPlannerInput) => Promise<void>;
  initialValues?: Partial<AITripPlannerInput> | null; // Added optional prop
};

export function TripPlannerInputSheet({ isOpen, onClose, onPlanRequest, initialValues }: TripPlannerInputSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFormSubmit = async (values: AITripPlannerInput) => {
    setIsSubmitting(true);
    await onPlanRequest(values);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className={cn("w-full sm:max-w-md md:max-w-lg flex flex-col p-0 glass-pane border-l-border/30")}>
        <SheetHeader className="p-6 pb-4 border-b border-border/30 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
           <div className="flex justify-between items-center">
            <div>
              <SheetTitle className="text-foreground">Plan Your Adventure</SheetTitle>
              <SheetDescription className="text-muted-foreground">
                {initialValues ? "Refining your plan..." : "Tell us your destination, dates, and budget."}
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="ml-2 text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground">
                <XIcon className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto p-6 pr-4">
          <TripInputForm
            onItinerariesFetched={() => {}}
            setIsLoading={setIsSubmitting}
            onSubmitProp={handleFormSubmit}
            initialValues={initialValues} // Pass initial values to the form
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
