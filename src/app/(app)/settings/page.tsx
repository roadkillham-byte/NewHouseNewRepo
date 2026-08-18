import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireMember } from "@/lib/session";
import { PageHeader } from "@/components/page-header";
import { getMembersForSettings } from "@/db/queries/settings";
import { listTimeZones } from "@/lib/timezones";
import { HouseForm } from "./house-form";
import { MembersPanel } from "./members-panel";
import { PasswordForm } from "./password-form";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const member = await requireMember();
  const householdMembers = await getMembersForSettings(member.householdId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="The house, who lives in it, and your own account."
        icon={SlidersHorizontal}
        accent="settings"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Housemates</CardTitle>
              <CardDescription>
                Everyone can add, edit and move out housemates — no one person holds the keys.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembersPanel members={householdMembers} currentMemberId={member.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>The house</CardTitle>
              <CardDescription>Name and timezone.</CardDescription>
            </CardHeader>
            <CardContent>
              <HouseForm
                name={member.householdName}
                timezone={member.householdTimezone}
                timezones={listTimeZones()}
              />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Light, dark, or whatever this device is set to. Saved on this device only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                memberId={member.id}
                name={member.name}
                avatarColor={member.avatarColor}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your password</CardTitle>
              <CardDescription>Signed in as {member.email}.</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
