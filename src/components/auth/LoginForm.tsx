
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, LogIn, Mail, KeyRound } from "lucide-react"; // Corrected
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
    <title>Google</title>
    <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.62-4.38 1.62-3.82 0-6.91-3.02-6.91-6.91s3.02-6.91 6.91-6.91c1.84 0 3.21.65 4.1 1.55l2.65-2.58C18.04 3.32 15.87 2 12.48 2c-5.61 0-10.2 4.5-10.2 10.2s4.5 10.2 10.2 10.2c3.22 0 5.53-1.08 7.36-2.91 1.99-1.99 2.65-4.82 2.65-7.72 0-.65-.05-1.22-.14-1.79H12.48z"/>
  </svg>
);


const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const { loginWithEmail, loginWithGoogle, loading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await loginWithEmail(values.email, values.password);
  }

  const handleGoogleSignIn = async () => {
    await loginWithGoogle();
  };

  return (
    <Card className={cn("w-full max-w-md", "glass-card")}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center text-foreground">
          <LogIn className="w-7 h-7 mr-2 text-primary" /> Login to BudgetRoam
        </CardTitle>
        <CardDescription className="text-muted-foreground">Access your personalized travel plans and tools.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><Mail className="w-4 h-4 mr-2 text-muted-foreground" />Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center text-foreground/90"><KeyRound className="w-4 h-4 mr-2 text-muted-foreground" />Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="bg-input/70 border-border/70 focus:bg-input/90 dark:bg-input/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full text-lg py-3 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
              Login
            </Button>
          </form>
        </Form>
        <Separator className="my-6 bg-border/50" />
        <div className="space-y-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full text-lg py-3 glass-interactive"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Sign in with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Button variant="link" asChild className="px-0.5 text-primary hover:text-accent">
              <Link href="/signup">Sign up</Link>
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
