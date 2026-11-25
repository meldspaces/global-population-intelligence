import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/gpi/dashboard";
import { TopicBoard } from "@/components/gpi/topic-board";
import { listReports } from "@/lib/gpi/reports";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await listReports();
    } catch (error) {
      console.error("[reports] unavailable", error);
      return [];
    }
  },
  component: Home,
});

function Home() {
  const reports = Route.useLoaderData();
  return (
    <>
      <TopicBoard reports={reports} />
      <Dashboard />
    </>
  );
}
