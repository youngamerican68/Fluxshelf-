import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TriggerWorkerButton } from "@/components/trigger-worker-button";

function getStatusColor(status: string) {
  switch (status) {
    case "succeeded":
      return "success";
    case "running":
      return "warning";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function AdminJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email || "")) {
    redirect("/app");
  }

  // Get recent jobs
  interface JobWithCampaign {
    id: string;
    campaign_id: string;
    step: string;
    status: string;
    attempts: number;
    last_error: string | null;
    created_at: string;
    campaigns: { product_title: string | null; owner_id: string } | null;
  }
  const { data: jobs } = await (supabase
    .from("generation_jobs") as any)
    .select("*, campaigns(product_title, owner_id)")
    .order("created_at", { ascending: false })
    .limit(100) as { data: JobWithCampaign[] | null };

  // Get job stats
  const { data: stats } = await (supabase
    .from("generation_jobs") as any)
    .select("status")
    .then(({ data }: { data: { status: string }[] | null }) => {
      const counts: Record<string, number> = {
        queued: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
      };
      data?.forEach((j) => {
        counts[j.status] = (counts[j.status] || 0) + 1;
      });
      return { data: counts };
    });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Admin: Job Queue</h1>
            <p className="text-muted-foreground">
              Monitor and debug generation jobs
            </p>
          </div>
        </div>
        <TriggerWorkerButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Queued</CardDescription>
            <CardTitle className="text-3xl">{stats?.queued || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Running</CardDescription>
            <CardTitle className="text-3xl">{stats?.running || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Succeeded</CardDescription>
            <CardTitle className="text-3xl">{stats?.succeeded || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-3xl">{stats?.failed || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Last 100 generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs">
                    {job.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    {job.campaigns?.product_title || "Unknown"}
                  </TableCell>
                  <TableCell className="capitalize">{job.step}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(job.status) as "default"}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.attempts}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {job.last_error || "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(job.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
