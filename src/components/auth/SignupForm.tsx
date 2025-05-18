
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
import { Loader2Icon, UserPlusIcon, MailIcon, KeyRoundIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Define a simple SVG for Google icon as lucide-react doesn't have it directly
const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.62-4.38 1.62-3.82 0-6.91-3.02-6.91-6.91s3.02-6.91 6.91-6.91c1.84 0 3.21.65 4.1 1.55l2.65-2.58C18.04 3.32 15.87 2 12.48 2c-5.61 0-10.2 4.5-10.2 10.2s4.5 10.2 10.2 10.2c3.22 0 5.53-1.08 7.36-2.91 1.99-1.99 2.65-4.82 2.65-7.72 0-.65-.05-1.22-.14-1.79H12.48z"/>
  </svg>
);

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  // confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }), // Optional: add confirm password
})
// .refine((data) => data.password === data.confirmPassword, { // Optional: add confirm password validation
//   message: "Passwords don't match",
//   path: ["confirmPassword"],
// });


export function SignupForm() {
  const { signupWithEmail, loginWithGoogle, loading } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      // confirmPassword: "", // Optional
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await signupWithEmail(values.email, values.password);
  }

  const handleGoogleSignUp = async () => {
    await loginWithGoogle(); // Google sign-in handles both login and signup scenarios
  };


  return (
    <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-md border-border/30">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl flex items-center justify-center">
          <UserPlusIcon className="w-7 h-7 mr-2 text-primary" /> Create Your Account
        </CardTitle>
        <CardDescription>Join BudgetRoam and start planning smarter.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MailIcon className="w-4 h-4 mr-2 text-muted-foreground" />Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
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
                  <FormLabel className="flex items-center"><KeyRoundIcon className="w-4 h-4 mr-2 text-muted-foreground" />Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Create a strong password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Optional: Confirm Password Field
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><KeyRoundIcon className="w-4 h-4 mr-2 text-muted-foreground" />Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Re-enter your password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
              Sign Up
            </Button>
          </form>
        </Form>
        <Separator className="my-6" />
        <div className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={loading}>
            {loading ? <Loader2Icon className="animate-spin" /> : <GoogleIcon />}
             Sign up with Google
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" asChild className="px-0.5">
              <Link href="/login">Login</Link>
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
