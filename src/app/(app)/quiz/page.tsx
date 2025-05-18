
"use client";

import { AdventureQuizForm } from "@/components/quiz/AdventureQuizForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdventureQuizPage() {
  const handleSubmitQuiz = (answers: any) => {
    // For now, just log the answers.
    // In a future step, these answers would be sent to an AI Matcher flow.
    console.log("Quiz Answers:", answers);
    // Potentially redirect to a results page or show a "Thank You / Processing" message.
  };

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in-up">
      <Card className={cn("w-full max-w-2xl mx-auto", "glass-card")}>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground flex items-center justify-center">
            <BrainIcon className="w-8 h-8 mr-3 text-primary" />
            Discover Your Travel Persona
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Answer a few questions, and we'll help you find your next perfect adventure!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdventureQuizForm onSubmit={handleSubmitQuiz} />
        </CardContent>
      </Card>
    </div>
  );
}
