import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const steps = [
  ["node", ["--experimental-strip-types", "--test", "src/lib/gpi/warehouse.test.ts"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]],
];

const results = [];
let ok = true;
for (const [cmd, args] of steps) {
  const result = spawnSync(cmd, args, { cwd: "/workspace", stdio: "inherit" });
  const status = result.status ?? 1;
  results.push({ cmd: [cmd, ...args].join(" "), status });
  if (status !== 0) {
    ok = false;
    break;
  }
}

const report = { at: new Date().toISOString(), ok, results };
writeFileSync("/workspace/docs/LAST_SHIP.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
process.exit(ok ? 0 : 1);
