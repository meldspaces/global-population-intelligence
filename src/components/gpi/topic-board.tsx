import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ReportCard } from "@/lib/gpi/reports";
import { TopicIcon } from "@/components/gpi/topic-icon";

export function TopicBoard({ reports }: { reports: ReportCard[] }) {
  const [active, setActive] = useState(reports[0]?.slug ?? "");
  if (!reports.length) return null;

  return (
    <section className="topic-board" aria-label="Today's topics">
      <div className="topic-rail" role="tablist" aria-label="Top topics">
        {reports.map((report) => (
          <button
            key={report.slug}
            type="button"
            role="tab"
            id={`tab-${report.slug}`}
            aria-selected={active === report.slug}
            aria-controls={`card-${report.slug}`}
            className="topic-tab"
            onClick={() => {
              setActive(report.slug);
              document.getElementById(`card-${report.slug}`)?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "nearest",
              });
            }}
          >
            <TopicIcon name={report.iconKey} />
            <span>{report.tabLabel}</span>
          </button>
        ))}
      </div>
      <div className="mosaic">
        {reports.map((report) => (
          <Link
            key={report.slug}
            id={`card-${report.slug}`}
            to="/reports/$slug"
            params={{ slug: report.slug }}
            role="tabpanel"
            aria-labelledby={`tab-${report.slug}`}
            className={`report-card span-${report.span}${active === report.slug ? " is-active" : ""}`}
            data-category={report.category}
          >
            <span className="report-kicker">
              <TopicIcon name={report.iconKey} />
              {report.category}
              <span className="report-rank">Priority {report.priority}</span>
            </span>
            <strong>{report.title}</strong>
            <span className="report-dek">{report.dek}</span>
            <span className="report-meta">
              Evidence {report.evidence} · {report.asOf}
            </span>
          </Link>
        ))}
      </div>
      <p className="fine topic-note">Nothing about a person using this app is stored. Rankings change. Reports stay.</p>
    </section>
  );
}
