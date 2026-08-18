import { House } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {/* The one screen with no household yet, so it keeps the product
                name — everywhere past sign-in shows the house's own name. */}
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <House className="size-5 text-primary" aria-hidden />
              House OS
            </h1>
          </CardTitle>
          <CardDescription>Sign in with your household account.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm callbackUrl={callbackUrl ?? "/"} />
        </CardContent>
      </Card>
    </div>
  );
}
