#!/usr/bin/env node
/**
 * Reconcile docs/tracker.json with GitHub issues.
 * One milestone per automation execution date. Re-running updates; it does not duplicate.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const tracker = JSON.parse(readFileSync(new URL("../docs/tracker.json", import.meta.url), "utf8"));
const { owner, repo, assignee, runs } = tracker;
const slug = `${owner}/${repo}`;

function gh(args, input) {
  return execFileSync("gh", args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
}

function api(method, path, body) {
  const args = ["api", "--method", method, `repos/${slug}${path}`];
  if (body) args.push("--input", "-");
  const out = gh(args, body ? JSON.stringify(body) : undefined);
  return out ? JSON.parse(out) : null;
}

function ensureLabel(name, color, description) {
  try {
    api("POST", "/labels", { name, color, description });
  } catch {
    // already exists
  }
}

function milestoneNumber(date) {
  const existing = api("GET", "/milestones?state=all&per_page=100");
  const found = existing.find((item) => item.title === date);
  if (found) return found.number;
  const created = api("POST", "/milestones", {
    title: date,
    description: `Automation execution on ${date}. Issues in this milestone were opened or closed by that pass.`,
    state: "open",
  });
  return created.number;
}

function existingIssues() {
  return JSON.parse(
    gh([
      "issue",
      "list",
      "--repo",
      slug,
      "--state",
      "all",
      "--limit",
      "200",
      "--json",
      "number,title,body,state",
    ]),
  );
}

const COLORS = {
  "area:warehouse": "8a6232",
  "area:atlas": "1c1915",
  "area:reports": "b4532a",
  "area:deploy": "5c564c",
  "area:map": "6e7c8a",
  "area:automation": "b4532a",
  bug: "9b2c2c",
};

for (const run of runs) {
  ensureLabel(`run:${run.date}`, "1c1915", `Work from the ${run.date} automation pass`);
  const milestone = milestoneNumber(run.date);
  const issues = existingIssues();
  for (const item of run.items) {
    const marker = `tracker-key: ${item.key}`;
    const labels = [`run:${run.date}`, ...(item.labels ?? [])];
    for (const label of labels) {
      if (label.startsWith("run:")) continue;
      ensureLabel(label, COLORS[label] ?? "5c564c", label);
    }
    const body = `${item.body}\n\n${marker}\n`;
    const current = issues.find((issue) => (issue.body ?? "").includes(marker));
    if (!current) {
      const created = api("POST", "/issues", {
        title: item.title,
        body,
        labels,
        milestone,
        assignees: [assignee],
      });
      issues.push({ number: created.number, title: item.title, body, state: created.state });
      if (item.state === "closed") {
        api("PATCH", `/issues/${created.number}`, {
          state: "closed",
          state_reason: item.reason ?? "completed",
        });
      }
      console.log(`${item.state} #${created.number} ${item.title}`);
      continue;
    }
    api("PATCH", `/issues/${current.number}`, {
      title: item.title,
      body,
      labels,
      milestone,
      assignees: [assignee],
      state: item.state === "closed" ? "closed" : "open",
      state_reason: item.state === "closed" ? item.reason ?? "completed" : "reopened",
    });
    console.log(`updated #${current.number} ${item.title}`);
  }
}
