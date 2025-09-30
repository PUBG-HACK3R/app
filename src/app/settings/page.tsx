import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your profile, security, and notifications.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Coming soon: name, email, avatar</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Supabase Auth integration pending.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Coming soon: password reset, 2FA</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Coming soon: deposit/withdrawal emails</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
