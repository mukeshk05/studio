
"use client";

import Link from "next/link";
import { AppLogo } from "./app-logo";
import { MainNav } from "./main-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, LogOutIcon, LogInIcon, UserPlusIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Header() {
  const { currentUser, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 glass-pane">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <AppLogo />
          <MainNav />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md bg-muted/50" />
              <Skeleton className="h-9 w-9 rounded-full bg-muted/50 hidden sm:block" />
            </div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-accent/20">
                  <Avatar className="h-9 w-9 border border-primary/50">
                    <AvatarImage 
                      src={currentUser.photoURL || undefined} 
                      alt={currentUser.displayName || currentUser.email || "User avatar"} 
                    />
                    <AvatarFallback className="bg-muted/50">
                      <UserIcon className="h-5 w-5 text-foreground/80" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card border-border/50" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    {currentUser.email && (
                       <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50"/>
                <DropdownMenuItem onClick={logout} className="cursor-pointer focus:bg-destructive/20 focus:text-destructive-foreground">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link 
                href="/login" 
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "hidden sm:inline-flex items-center border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                )}
              >
                <LogInIcon className="mr-1 h-4 w-4" /> Login
              </Link>
              <Link 
                href="/login" 
                aria-label="Login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "sm:hidden text-primary hover:bg-primary/10"
                )}
              >
                <LogInIcon />
              </Link>
              <Link 
                href="/signup" 
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }), // Default for primary action
                  "hidden sm:inline-flex items-center shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
                )}
              >
                <UserPlusIcon className="mr-1 h-4 w-4" /> Sign Up
              </Link>
               <Link 
                href="/signup" 
                aria-label="Sign Up"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "sm:hidden text-primary hover:bg-primary/10"
                )}
              >
                <UserPlusIcon />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
