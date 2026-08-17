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
            <h1>House OS</h1>
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
