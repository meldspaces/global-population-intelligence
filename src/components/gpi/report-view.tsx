import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { Analysis, sentimentFor } from "@/components/gpi/analysis";
import { TopicIcon } from "@/components/gpi/topic-icon";
import type { TrendChartProps } from "@/components/gpi/trend-chart";
import { indicatorByCode } from "@/lib/gpi/model";
import type { ReportDetail } from "@/lib/gpi/reports";

export function ReportView({ report }: { report: ReportDetail }) {
  const series = report.seriesCodes[0];
  const year = report.focusYear ?? new Date().getUTCFullYear();
  const focus = report.focusIso ?? "USA";
  const tone = series ? sentimentFor(series, year) : null;
  const [Chart, setChart] = useState<ComponentType<TrendChartProps> | null>(null);

  useEffect(() => {
    let live = true;
    void import("@/components/gpi/trend-chart").then((mod) => {
      if (live) setChart(() => mod.TrendChart);
    });
    return () => {
      live = false;
    };
  }, []);

  const articles = report.links.filter((link) => link.kind !== "data");
  const sources = report.links.filter((link) => link.kind === "data");

  return (
    <article className="report-page">
      <p className="kicker">
        <TopicIcon name={report.iconKey} /> {report.category} · {report.asOf}
      </p>
      <h1>{report.title}</h1>
      <p className="lede">{report.dek}</p>
      {report.finding && <p className="finding">Why this is ranked here: {report.finding}</p>}
      {tone && (
        <p className="tone">
          <strong>{tone.label}.</strong> {tone.method}
        </p>
      )}
      <Analysis blocks={report.analysis} />
      {series && Chart && (
        <section className="panel" aria-label="Chart">
          <div className="panel-head">
            <h2>{indicatorByCode(series).short}</h2>
            <p>Computed from the warehouse</p>
          </div>
          <Chart
            mode="trend"
            code={series}
            compare={null}
            year={year}
            focus={focus}
            pins={[]}
            log={false}
            onSelect={() => undefined}
          />
        </section>
      )}
      <section className="panel">
        <h2>Data sources</h2>
        <ul className="link-list">
          {sources.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </a>
              <span>
                {link.author ?? "Source"} · relevance {link.relevance}. {link.relevanceReason}
              </span>
            </li>
          ))}
          {sources.length === 0 && <li>No data source cleared the relevance check.</li>}
        </ul>
      </section>
      <section className="panel">
        <h2>Related articles and posts</h2>
        <ul className="link-list">
          {articles.map((link) => (
            <li key={link.url}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </a>
              <span>
                {link.author ?? link.account ?? "Unsigned"}
                {link.publishedOn ? ` · ${link.publishedOn}` : ""} · relevance {link.relevance}. {link.relevanceReason}
              </span>
              {link.excerpt && <span>{link.excerpt}</span>}
              <span className="bias">
                Author {link.biasAuthor} · account {link.biasAccount} · post {link.biasPost}
                {link.biasRater ? ` · ${link.biasRater}` : " · no published rating on file"}
                {link.biasCheckedOn ? `, checked ${link.biasCheckedOn}` : ""}
              </span>
            </li>
          ))}
          {articles.length === 0 && <li>No article or post cleared the relevance check today.</li>}
        </ul>
      </section>
      {report.people.length > 0 && (
        <section className="panel">
          <h2>People named in the sources</h2>
          <ul className="link-list">
            {report.people.map((person) => (
              <li key={`${person.name}-${person.sourceUrl}`}>
                <a href={person.sourceUrl} target="_blank" rel="noreferrer">
                  {person.name}
                </a>
                <span>
                  {person.role}. Named in {person.sourceTitle}.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="fine">
        This app does not store information about people who use it. Figures are calculated when the page loads.
      </p>
      <p>
        <Link to="/" className="text-button">
          Back to the atlas
        </Link>
      </p>
    </article>
  );
}
