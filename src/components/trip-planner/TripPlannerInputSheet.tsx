
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TripInputForm } from "./trip-input-form";
import type { AITripPlannerInput } from "@/ai/flows/ai-trip-planner";
import React from "react";

type TripPlannerInputSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlanRequest: (input: AITripPlannerInput) => Promise<void>;
};

export function TripPlannerInputSheet({ isOpen, onClose, onPlanRequest }: TripPlannerInputSheetProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFormSubmit = async (values: AITripPlannerInput) => {
    setIsSubmitting(true);
    await onPlanRequest(values);
    setIsSubmitting(false);
    onClose(); 
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Plan Your Adventure</SheetTitle>
          <SheetDescription>
            Tell us your destination, dates, and budget. BudgetRoam AI will craft amazing options for you!
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-y-auto p-6 pr-4"> {/* Adjusted padding */}
          <TripInputForm 
            onItinerariesFetched={() => {}} 
            setIsLoading={setIsSubmitting} 
            onSubmitProp={handleFormSubmit} 
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
