
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRingIcon, BellOffIcon, Loader2Icon } from "lucide-react";
import { requestPermissionAndGetToken } from "@/lib/firebaseMessaging";
import { cn } from "@/lib/utils";

export function NotificationSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsEnabled(Notification.permission === "granted");
      if (localStorage.getItem('fcmToken') && Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    const token = await requestPermissionAndGetToken();
    if (token) {
      setNotificationsEnabled(true);
    }
    setIsLoading(false);
  };

  if (!isSupported) {
    return (
       <Card className={cn("glass-card", "border-muted-foreground/20")}>
        <CardHeader>
            <CardTitle className="flex items-center text-lg text-card-foreground">
            <BellOffIcon className="w-5 h-5 mr-2 text-muted-foreground" />
            Push Notifications
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
            Push notifications are not supported by your browser.
            </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("glass-card", notificationsEnabled ? "border-green-500/30" : "border-primary/30")}>
      <CardHeader>
        <CardTitle className="flex items-center text-lg text-card-foreground">
          {notificationsEnabled ? (
            <BellRingIcon className="w-5 h-5 mr-2 text-green-400" />
          ) : (
            <BellOffIcon className="w-5 h-5 mr-2 text-primary" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {notificationsEnabled
            ? "You are set to receive push notifications."
            : "Enable push notifications to get real-time updates."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!notificationsEnabled && (
          <Button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
          >
            {isLoading ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <BellRingIcon />
            )}
            Enable Notifications
          </Button>
        )}
         {notificationsEnabled && (
            <p className="text-sm text-green-400">
              Notifications are active. To disable, manage permissions in your browser settings.
            </p>
        )}
      </CardContent>
    </Card>
  );
}
