
"use client";

import Link from "next/link";
import { AppLogo } from "./app-logo";
import { MainNav } from "./main-nav";
import { Button } from "@/components/ui/button";
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
import { UserIcon, LogOutIcon, LogInIcon, UserPlusIcon, Loader2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";


export function Header() {
  const { currentUser, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <AppLogo />
          <MainNav />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-full hidden sm:block" />
            </div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage 
                      src={currentUser.photoURL || undefined} 
                      alt={currentUser.displayName || currentUser.email || "User avatar"} 
                    />
                    <AvatarFallback>
                      <UserIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    {currentUser.email && (
                       <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">
                  <LogInIcon /> Login
                </Link>
              </Button>
               <Button asChild variant="ghost" size="icon" className="sm:hidden">
                <Link href="/login" aria-label="Login">
                  <LogInIcon />
                </Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/signup">
                  <UserPlusIcon /> Sign Up
                </Link>
              </Button>
               <Button asChild variant="ghost" size="icon" className="sm:hidden">
                <Link href="/signup" aria-label="Sign Up">
                  <UserPlusIcon />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
