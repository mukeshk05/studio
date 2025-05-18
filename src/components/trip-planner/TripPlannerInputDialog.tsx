
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TripInputForm } from "./trip-input-form";
import type { AITripPlannerInput } from "@/ai/flows/ai-trip-planner";
import React from "react"; // Keep React import if TripInputForm uses it directly (it does)

type TripPlannerInputDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onPlanRequest: (input: AITripPlannerInput) => Promise<void>;
};

export function TripPlannerInputDialog({ isOpen, onClose, onPlanRequest }: TripPlannerInputDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // This function will be passed to TripInputForm
  const handleFormSubmit = async (values: AITripPlannerInput) => {
    setIsSubmitting(true); // Indicate loading within the dialog if needed, or rely on chat
    await onPlanRequest(values);
    setIsSubmitting(false);
    onClose(); // Close dialog after submitting
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Plan Your Adventure</DialogTitle>
          <DialogDescription>
            Tell us your destination, dates, and budget. BudgetRoam AI will craft amazing options for you!
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2"> {/* pr-2 for scrollbar space */}
          <TripInputForm 
            onItinerariesFetched={() => {}} // This prop is now handled by onPlanRequest directly
            setIsLoading={setIsSubmitting} // Link form's loading to dialog's submit state
            onSubmitProp={handleFormSubmit} // Pass the new handler
          />
        </div>
        {/* Footer can be part of TripInputForm's submit button, or DialogFooter can be used
            For simplicity, TripInputForm already has its submit button.
            If we want a separate "Cancel" button here, we can add DialogFooter.
        */}
      </DialogContent>
    </Dialog>
  );
}
