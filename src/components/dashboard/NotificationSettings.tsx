
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing, BellOff, Loader2, Mail, Sparkles } from "lucide-react";
import { requestPermissionAndGetToken } from "@/lib/firebaseMessaging";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";


export function NotificationSettings() {
  const [isLoadingPush, setIsLoadingPush] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(true);

  const [enableTripReminders, setEnableTripReminders] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'localStorage' in window && 'serviceWorker' in navigator) {
      setNotificationsEnabled(Notification.permission === "granted" && !!localStorage.getItem('fcmToken'));
    } else {
      setIsPushSupported(false);
    }
  }, []);

  const handleEnablePushNotifications = async () => {
    setIsLoadingPush(true);
    const token = await requestPermissionAndGetToken();
    if (token) {
      setNotificationsEnabled(true);
      // Toast for success is handled in requestPermissionAndGetToken
    } else {
      // Toast for failure/denial is handled in requestPermissionAndGetToken
      setNotificationsEnabled(false); 
    }
    setIsLoadingPush(false);
  };

  const handleTripReminderToggle = (checked: boolean) => {
    setEnableTripReminders(checked);
    toast({
      title: "Trip Reminders Setting Changed",
      description: `Trip reminder emails are now ${checked ? "enabled" : "disabled"}. (Conceptual - no emails will be sent yet)`,
    });
    // Here you would typically save this preference to the user's profile in Firestore
    // For example: await updateUserPreferences({ tripReminders: checked });
  };


  return (
    <Card className={cn("glass-card", notificationsEnabled ? "border-green-500/30" : "border-primary/30")}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg text-card-foreground">
          {notificationsEnabled ? (
            <BellRing className="w-5 h-5 mr-2 text-green-400" />
          ) : (
            <BellOff className="w-5 h-5 mr-2 text-primary" />
          )}
          Notification Preferences
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage how you receive updates from BudgetRoam.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
            <h4 className="text-sm font-medium text-card-foreground mb-2">Push Notifications</h4>
            {!isPushSupported ? (
                 <p className="text-xs text-muted-foreground">
                    Push notifications are not supported by your browser or this environment.
                 </p>
            ) : notificationsEnabled ? (
                <p className="text-xs text-green-400">
                Push notifications are currently active. To disable, manage permissions in your browser settings.
                </p>
            ) : (
            <Button
                onClick={handleEnablePushNotifications}
                disabled={isLoadingPush}
                size="sm"
                className="w-full sm:w-auto text-sm py-2 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
            >
                {isLoadingPush ? (
                <Loader2 className="animate-spin" />
                ) : (
                <BellRing />
                )}
                Enable Push Notifications
            </Button>
            )}
        </div>
        
        <Separator />

        <div>
            <h4 className="text-sm font-medium text-card-foreground mb-2">Email Reminders (Conceptual)</h4>
            <div className="flex items-center space-x-2">
                <Switch
                id="trip-reminders"
                checked={enableTripReminders}
                onCheckedChange={handleTripReminderToggle}
                aria-label="Toggle trip reminder emails"
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                />
                <Label htmlFor="trip-reminders" className="text-xs text-muted-foreground cursor-pointer">
                Receive emails about upcoming trips (e.g., 3 days before departure).
                </Label>
            </div>
            <p className="text-xs text-muted-foreground/80 mt-1.5 italic">
                (This is a UI placeholder. Actual email sending functionality is a future feature.)
            </p>
        </div>

      </CardContent>
       <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Manage your communication preferences to stay informed.
        </p>
      </CardFooter>
    </Card>
  );
}
