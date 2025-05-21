
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Languages, Mic, MessageSquareQuote, Info, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image'; // Keep for consistency, though not used for dynamic images here
import { Separator } from '@/components/ui/separator';

const glassCardClasses = "glass-card border-lime-500/30 hover:border-lime-400/50 transition-all";
const innerGlassEffectClasses = "bg-card/80 dark:bg-card/50 backdrop-blur-md border border-white/10 dark:border-[hsl(var(--primary)/0.1)] rounded-md";

interface LocalPhraseExample {
  phrase: string;
  literalTranslation?: string;
  localNuance: string;
  pronunciationTip?: string;
  culturalInsight?: string;
}

interface LanguageContextData {
  [language: string]: {
    [context: string]: LocalPhraseExample[];
  };
}

const mockLanguageData: LanguageContextData = {
  Spanish: {
    "Madrid Street Slang": [
      {
        phrase: "Estar flipando",
        literalTranslation: "To be flipping",
        localNuance: "To be amazed, shocked, or find something incredible/unbelievable. Often used with 'en colores' (in colors) for emphasis.",
        pronunciationTip: "Emphasize 'flip-AHN-do'.",
        culturalInsight: "Reflects a very expressive and animated way of speaking common among young Madrileños."
      },
      {
        phrase: "Molar un montón",
        literalTranslation: "To 'molar' a lot (molar is like 'to be cool')",
        localNuance: "To be very cool, awesome, or really like something a lot.",
        pronunciationTip: "Roll the 'r' in 'molar'.",
        culturalInsight: "'Molar' is a classic Spanish slang term for 'cool'."
      }
    ],
    "Buenos Aires Lunfardo": [
      {
        phrase: "Che, ¿qué onda?",
        literalTranslation: "'Hey, what wave?'",
        localNuance: "A very common greeting meaning 'Hey, what's up?' or 'How's it going?'. 'Che' is a classic Argentine interjection.",
        pronunciationTip: "'Che' like the start of 'check'. 'Onda' with a clear 'o'.",
        culturalInsight: "Lunfardo is a rich slang dialect originating from the late 19th/early 20th century in Buenos Aires, with Italian and other immigrant influences."
      },
      {
        phrase: "Laburar",
        literalTranslation: "To work (from Italian 'lavorare')",
        localNuance: "The common slang term for 'to work'.",
        culturalInsight: "Shows the strong Italian influence in Argentine Spanish."
      }
    ]
  },
  Japanese: {
    "Tokyo Youth Slang": [
      {
        phrase: "ウケる (Ukeru)",
        localNuance: "Means 'funny' or 'hilarious'. Often used to react to something amusing.",
        pronunciationTip: "Oo-keh-roo.",
        culturalInsight: "Commonly used in casual conversation among younger people."
      },
      {
        phrase: "めっちゃ (Meccha)",
        localNuance: "Means 'very' or 'super'. Similar to 'totemo' but more informal.",
        pronunciationTip: "Meh-ch-chah (with a slight pause for the double 'c').",
      }
    ],
    "Osaka Dialect (Osaka-ben)": [
      {
        phrase: "なんでやねん！ (Nande ya nen!)",
        localNuance: "A quintessential Osaka phrase expressing surprise, disbelief, or a lighthearted 'What the heck?!' or 'Why?!'.",
        pronunciationTip: "NAN-deh ya nen!",
        culturalInsight: "Osaka-ben is known for being more direct and humorous than standard Japanese."
      },
      {
        phrase: "儲かりまっか？ (Moukari makka?)",
        literalTranslation: "Are you making a profit?",
        localNuance: "A traditional greeting among merchants in Osaka, essentially meaning 'How's business?' or 'How are you doing?'.",
        culturalInsight: "Reflects Osaka's historical role as a major commercial center."
      }
    ]
  },
};

export function HyperLocalLanguageCoachPlaceholder() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [availableContexts, setAvailableContexts] = useState<string[]>([]);
  const [currentExamples, setCurrentExamples] = useState<LocalPhraseExample[]>([]);

  useEffect(() => {
    if (selectedLanguage && mockLanguageData[selectedLanguage]) {
      setAvailableContexts(Object.keys(mockLanguageData[selectedLanguage]));
      setSelectedContext(""); // Reset context when language changes
      setCurrentExamples([]);
    } else {
      setAvailableContexts([]);
      setSelectedContext("");
      setCurrentExamples([]);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (selectedLanguage && selectedContext && mockLanguageData[selectedLanguage]?.[selectedContext]) {
      setCurrentExamples(mockLanguageData[selectedLanguage][selectedContext]);
    } else {
      setCurrentExamples([]);
    }
  }, [selectedLanguage, selectedContext]);

  return (
    <Card className={cn(glassCardClasses, "animate-fade-in-up")}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-lg text-card-foreground">
            <Languages className="w-6 h-6 mr-2 text-lime-400" />
            AI Hyper-Local Language Coach
          </CardTitle>
        </div>
        <CardDescription className="text-muted-foreground pt-1">
          Future Vision: Go beyond basic phrases! Learn local dialects, slang, idioms, and get real-time pronunciation feedback. Select a language and context below for a conceptual demo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="coach-language" className="text-sm font-medium text-card-foreground/90">Select Language</Label>
              <Select onValueChange={setSelectedLanguage} value={selectedLanguage}>
                <SelectTrigger id="coach-language" className="w-full mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50">
                  <SelectValue placeholder="Choose a language..." />
                </SelectTrigger>
                <SelectContent className="glass-pane border-border/50">
                  {Object.keys(mockLanguageData).map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="coach-context" className="text-sm font-medium text-card-foreground/90">Select Local Context</Label>
              <Select onValueChange={setSelectedContext} value={selectedContext} disabled={!selectedLanguage || availableContexts.length === 0}>
                <SelectTrigger id="coach-context" className="w-full mt-1 bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50">
                  <SelectValue placeholder={selectedLanguage ? "Choose a context..." : "Select language first..."} />
                </SelectTrigger>
                <SelectContent className="glass-pane border-border/50">
                  {availableContexts.map(ctx => (
                    <SelectItem key={ctx} value={ctx}>{ctx}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentExamples.length > 0 && (
            <div className={cn("mt-4 space-y-3 animate-fade-in", innerGlassEffectClasses, "p-4 rounded-lg")}>
              <h3 className="text-md font-semibold text-card-foreground flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-primary" />
                Examples for {selectedContext} ({selectedLanguage}):
              </h3>
              {currentExamples.map((ex, index) => (
                <div key={index} className="pb-2 mb-2 border-b border-border/30 last:border-b-0 last:pb-0 last:mb-0">
                  <p className="font-semibold text-sm text-lime-400">{ex.phrase}</p>
                  {ex.literalTranslation && <p className="text-xs text-muted-foreground italic">Literally: "{ex.literalTranslation}"</p>}
                  <p className="text-xs text-card-foreground/90 mt-0.5"><strong className="text-primary/90">Nuance:</strong> {ex.localNuance}</p>
                  {ex.pronunciationTip && <p className="text-xs text-card-foreground/90 mt-0.5"><strong className="text-primary/90">Pronunciation Tip:</strong> {ex.pronunciationTip}</p>}
                  {ex.culturalInsight && <p className="text-xs text-card-foreground/90 mt-0.5"><strong className="text-primary/90">Cultural Insight:</strong> {ex.culturalInsight}</p>}
                </div>
              ))}
            </div>
          )}

          {!selectedLanguage && !selectedContext && (
            <div className="text-center py-6 text-muted-foreground">
              <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-50"/>
              <p>Select a language and context to see simulated hyper-local phrases and insights.</p>
            </div>
          )}
           {selectedLanguage && availableContexts.length > 0 && !selectedContext && (
            <div className="text-center py-6 text-muted-foreground">
              <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-50"/>
              <p>Now, please select a local context for {selectedLanguage}.</p>
            </div>
          )}
           {selectedLanguage && availableContexts.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="w-10 h-10 mx-auto mb-2 opacity-50"/>
              <p>No specific local contexts defined for {selectedLanguage} in this demo yet.</p>
            </div>
          )}
           {selectedLanguage && selectedContext && currentExamples.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="w-10 h-10 mx-auto mb-2 opacity-50"/>
              <p>No phrase examples available for "{selectedContext}" in {selectedLanguage} in this demo.</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <p className="text-xs text-muted-foreground text-center w-full flex items-center justify-center">
          <Info className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          This is a conceptual demonstration. Full AI dialect coaching and pronunciation feedback is a future vision.
        </p>
      </CardFooter>
    </Card>
  );
}
