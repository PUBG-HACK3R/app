import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signupAction } from "@/app/actions/auth";

interface Props {
  searchParams: { 
    error?: string; 
  };
}

export default function ServerSignupPage({ searchParams }: Props) {
  const { error } = searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              WeEarn
            </span>
          </div>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join WeEarn and start earning daily returns (Server-side)</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signupAction} className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm">Email</label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                required 
                placeholder="your@email.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm">Password</label>
              <Input 
                id="password" 
                name="password"
                type="password" 
                required 
                placeholder="At least 6 characters"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive bg-red-50 dark:bg-red-950 p-2 rounded">
                {error}
              </p>
            )}
            <Button type="submit">
              Create account
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link className="underline" href="/login-server">Log in</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Having issues? <Link className="underline" href="/signup">Try the client-side signup</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
