import { createFileRoute, notFound } from "@tanstack/react-router";
import { ReportView } from "@/components/gpi/report-view";
import { getReport } from "@/lib/gpi/reports";

export const Route = createFileRoute("/reports/$slug")({
  loader: async ({ params }) => {
    const report = await getReport({ data: params.slug });
    if (!report) throw notFound();
    return report;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} · Global Population Intelligence` : "Report" },
      { name: "description", content: loaderData?.dek ?? "" },
      { property: "og:title", content: loaderData?.title ?? "Report" },
      { property: "og:description", content: loaderData?.dek ?? "" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: ReportPage,
  notFoundComponent: () => (
    <main className="report-page">
      <h1>That report is not in the database.</h1>
      <p>Reports are kept. This address does not match one.</p>
    </main>
  ),
});

function ReportPage() {
  const report = Route.useLoaderData();
  return <ReportView report={report} />;
}
