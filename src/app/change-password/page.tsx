import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/session";
import { PasswordForm } from "../(app)/settings/password-form";

/**
 * Deliberately outside the (app) route group. The app layout redirects here
 * whenever `mustChangePassword` is set, so this page must not be inside the
 * thing doing the redirecting or it would loop forever.
 */
export default async function ChangePasswordPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  // Already sorted — nothing to do here.
  if (!member.mustChangePassword) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Pick your own password</h1>
          </CardTitle>
          <CardDescription>
            You&apos;re signed in with a temporary password someone else generated for you.
            Choose your own before carrying on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm submitLabel="Set my password" />
        </CardContent>
      </Card>
    </div>
  );
}
