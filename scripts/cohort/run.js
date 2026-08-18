const { chromium } = require("playwright");
const fs = require("fs");
const PERSONAS = require("./personas.js");
const BASE = process.env.BASE || "http://localhost:3210";
// Run artifacts (screenshots, results.json) — gitignored; see scripts/cohort/.gitignore
const OUT = process.env.COHORT_OUT || require("path").join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

const LEGEND = {
  reward: "What kind of reward",
  income: "What's your annual income",
  fee: "How do you feel about annual fees",
  travel: "How often do you travel",
  wallet: "How do you tap to pay",
  effort: "How many cards are you willing",
};

async function answerPersona(page, p, log) {
  const fieldsets = page.locator("fieldset");
  const n = await fieldsets.count();
  if (n === 0) throw new Error("no persona questions rendered");
  for (let i = 0; i < n; i++) {
    const fsEl = fieldsets.nth(i);
    const legend = (await fsEl.locator("legend").innerText()).trim();
    const key = Object.keys(LEGEND).find((k) => legend.startsWith(LEGEND[k]));
    if (!key) { log.push(`UNMAPPED QUESTION: "${legend}"`); continue; }
    const want = p[key];
    const btn = fsEl.locator("button", { hasText: want }).first();
    if ((await btn.count()) === 0) throw new Error(`no option "${want}" for "${legend}"`);
    await btn.click();
  }
}

async function fillSpending(page, p, log) {
  const inputs = page.locator('input[type="number"]');
  const n = await inputs.count();
  if (n !== 10) log.push(`NOTE: expected 10 spending inputs, saw ${n}`);
  for (let i = 0; i < Math.min(n, p.spend.length); i++) {
    const v = p.spend[i];
    if (v === null || v === undefined) continue;
    await inputs.nth(i).fill(String(v));
  }
}

function parseCombo(text) {
  const m = text.match(/This (\d+)-card combo earns about[\s\S]{0,40}?RM([\d,]+)/);
  const fees = text.match(/net of RM([\d,]+) in annual fees \+ RM([\d,]+) government service tax/);
  if (!m) return null;
  return {
    cards: Number(m[1]),
    netRM: Number(m[2].replace(/,/g, "")),
    feesRM: fees ? Number(fees[1].replace(/,/g, "")) : null,
    taxRM: fees ? Number(fees[2].replace(/,/g, "")) : null,
  };
}

async function captureArticles(page) {
  return page.$$eval("article", (arts) =>
    arts.map((a) => {
      const h3 = a.querySelector("h3");
      const nums = [...a.querySelectorAll("div")]
        .map((d) => (d.childElementCount === 0 ? d.textContent.trim() : ""))
        .filter((t) => /^RM[\d,]+$/.test(t));
      return { name: h3 ? h3.textContent.trim() : null, value: nums[0] || null };
    }),
  );
}

async function runTester(browser, p) {
  const r = { id: p.id, name: p.name, flow: p.flow, errors: [], log: [], ok: false };
  const page = await browser.newPage({ viewport: { width: 900, height: 2000 } });
  page.on("pageerror", (e) => r.errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") r.errors.push("console: " + m.text().slice(0, 200)); });
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/${p.flow}`, { waitUntil: "networkidle" });
    await answerPersona(page, p, r.log);

    const next = page.getByRole("button", { name: /Next: my spending/ });
    if (await next.isDisabled()) throw new Error("Next button still disabled after answering all questions");
    await next.click();
    await page.waitForTimeout(250);

    await fillSpending(page, p, r.log);
    await page.waitForTimeout(150);

    if (p.flow === "recommend") {
      await page.getByRole("button", { name: /See my recommendations/ }).click();
      await page.waitForTimeout(600);
      const body = await page.locator("body").innerText();
      r.reachedResults = /Your recommendations/.test(body);
      if (!r.reachedResults) throw new Error("did not reach results screen");

      // single view
      await page.getByRole("button", { name: /Best single card/ }).click();
      await page.waitForTimeout(300);
      const singleText = await page.locator("body").innerText();
      r.single = (await captureArticles(page)).slice(0, 3);
      r.singleEmpty = /No eligible cards|No cards support/.test(singleText);
      r.emptyStateMsg = (singleText.match(/No (?:eligible cards|cards support)[^\n]*/) || [null])[0];

      // combo view
      await page.getByRole("button", { name: /Best combo/ }).click();
      await page.waitForTimeout(350);
      const comboText = await page.locator("body").innerText();
      r.combo = parseCombo(comboText);
      r.comboMembers = await captureArticles(page);
      r.singleCardFallback = /a single card is hard to beat/.test(comboText);
      r.additions = /Consider adding a card/.test(comboText);
      r.additionEntries = [...comboText.matchAll(/\+RM([\d,]+)\s*\n\s*\/ year/g)].map((m) => m[1]);
      r.tipsShown = /Maximize your gains/.test(comboText);
      r.tipsEmpty = /no worthwhile way to shift spend/.test(comboText);
      r.hiddenIncome = (comboText.match(/(\d+) cards? hidden \(income requirement not met\)/) || [null, null])[1];
      r.hiddenWallet = (comboText.match(/(\d+) cards? hidden \(no ([^)]+) support\)/) || [null, null])[1];
      await page.screenshot({ path: `${OUT}/shot-${String(p.id).padStart(2, "0")}.png`, fullPage: true });
    } else {
      // evaluate: advance to owned-card picker
      await page.getByRole("button", { name: /→/ }).last().click();
      await page.waitForTimeout(400);
      const pickerText = await page.locator("body").innerText();
      if (!/Which cards do you already have/.test(pickerText)) throw new Error("did not reach owned-card picker");
      for (const q of p.own) {
        const search = page.getByPlaceholder(/Search cards or banks/i);
        await search.fill(q);
        await page.waitForTimeout(250);
        const btn = page.locator('button[aria-pressed]', { hasText: q }).first();
        if ((await btn.count()) === 0) { r.log.push(`OWNED CARD NOT FOUND via search: "${q}"`); continue; }
        await btn.click();
      }
      await page.getByPlaceholder(/Search cards or banks/i).fill("");
      await page.waitForTimeout(200);
      const evalBtn = page.getByRole("button", { name: /^Evaluate my \d/ });
      if ((await evalBtn.count()) === 0) throw new Error("Evaluate button not enabled (no cards selected?)");
      await evalBtn.click();
      await page.waitForTimeout(700);
      const body = await page.locator("body").innerText();
      r.reachedResults = !/Which cards do you already have/.test(body);
      r.evalText = body.slice(0, 1400);
      r.upside = (body.match(/RM[\d,]+/g) || []).slice(0, 6);
      await page.screenshot({ path: `${OUT}/shot-${String(p.id).padStart(2, "0")}.png`, fullPage: true });
    }
    r.ok = true;
  } catch (e) {
    r.fatal = String(e).split("\n")[0];
    try { await page.screenshot({ path: `${OUT}/fail-${String(p.id).padStart(2, "0")}.png`, fullPage: true }); } catch {}
  }
  r.ms = Date.now() - t0;
  await page.close();
  return r;
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const results = [];
  const queue = [...PERSONAS];
  const WORKERS = 4;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (queue.length) {
        const p = queue.shift();
        const r = await runTester(browser, p);
        results.push(r);
        process.stdout.write(`  [${r.id}] ${r.ok ? "ok " : "FAIL"} ${r.name} (${r.ms}ms)${r.fatal ? " :: " + r.fatal : ""}\n`);
      }
    }),
  );
  await browser.close();
  results.sort((a, b) => a.id - b.id);
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

  // --- verdict -------------------------------------------------------------
  const num = (v) => (v ? Number(String(v).replace(/[^0-9.]/g, "")) : null);
  const fail = [];
  for (const r of results) {
    if (r.fatal) fail.push(`[${r.id}] ${r.name}: fatal — ${r.fatal}`);
    for (const e of r.errors) fail.push(`[${r.id}] ${r.name}: ${e}`);
    if (r.flow !== "recommend") continue;
    // The combo headline must equal the sum of what each member is shown to earn,
    // net of the fees and govt tax the same box reports.
    if (r.combo) {
      const sum = (r.comboMembers || []).filter((m) => m.value).reduce((a, m) => a + num(m.value), 0);
      const expect = sum - (r.combo.feesRM || 0) - (r.combo.taxRM || 0);
      if (Math.abs(expect - r.combo.netRM) > 2) {
        fail.push(`[${r.id}] ${r.name}: combo does not reconcile (members ${sum} - fees ${r.combo.feesRM} - tax ${r.combo.taxRM} = ${expect}, shown ${r.combo.netRM})`);
      }
    }
    // "Here's that card:" with no card rendered is a dead end.
    if (r.singleCardFallback && (r.comboMembers || []).length === 0) {
      fail.push(`[${r.id}] ${r.name}: combo view promises a card but renders none`);
    }
    if (!r.reachedResults) fail.push(`[${r.id}] ${r.name}: never reached the results screen`);
  }

  console.log(`\n${results.length} testers run, ${results.filter((r) => r.ok).length} completed.`);
  if (fail.length) {
    console.log(`\nFAILURES (${fail.length}):`);
    for (const f of fail) console.log("  - " + f);
    process.exit(1);
  }
  console.log("No page errors, no reconciliation failures, no dead ends.");
})().catch((e) => { console.error(e); process.exit(1); });
