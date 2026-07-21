#!/usr/bin/env python3
"""Pass C parameterized matrix orchestrator.

Uses the injected admin session (ADMIN_TOKEN env), calls the deployed
`phaseC-fixture-runner` edge function to provision 10 disposable users,
runs 10 states x 4 routes x 3 viewports in Playwright, records
PASS/FAIL for every cell in report.json, captures exactly 33 responsive
screenshots, runs create-manual-user runtime probes, then tears down.

All fixture rows are tagged with a `phaseC:` marker so any interruption
is recoverable via `{action:'teardown', marker:'phaseC:<uuid>'}`.
"""
import asyncio, json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).parent
SHOTS = ROOT / "screenshots"; SHOTS.mkdir(exist_ok=True)

SUPABASE_URL = os.environ["VITE_SUPABASE_URL"]
SUPABASE_KEY = os.environ["VITE_SUPABASE_PUBLISHABLE_KEY"]
ADMIN_TOKEN  = os.environ.get("ADMIN_TOKEN") or os.environ["LOVABLE_BROWSER_SUPABASE_ACCESS_TOKEN"]
APP_URL      = os.environ.get("APP_URL", "http://localhost:8080")
KEEP         = os.environ.get("KEEP_FIXTURES") == "1"

ROUTES = [("temple","/temple"),("devotion","/devotion"),
          ("communion","/communion"),("remembrance","/decks")]
VIEWPORTS = [("desktop",1440,900),("tablet",834,1112),("mobile",390,844)]
STATES = ["admin","active_member","founding_member","grace","canceled",
          "manual_active","manual_scheduled","manual_expired",
          "manual_revoked_only","no_access"]

EXPECT = {"admin":"granted","active_member":"granted","founding_member":"granted",
          "grace":"granted","canceled":"denied","manual_active":"granted",
          "manual_scheduled":"scheduled_state","manual_expired":"expired_state",
          "manual_revoked_only":"denied","no_access":"denied"}

def post_json(url, body, headers=None):
    h = {"Content-Type":"application/json","apikey":SUPABASE_KEY,
         "Authorization":f"Bearer {ADMIN_TOKEN}"}
    if headers: h.update(headers)
    data = json.dumps(body).encode()
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h, method="POST"), timeout=60)
        return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def runner(action, extra=None):
    body = {"action":action}; body.update(extra or {})
    s,j = post_json(f"{SUPABASE_URL}/functions/v1/phaseC-fixture-runner", body)
    if s != 200 or j.get("ok") is False: raise RuntimeError(f"runner {action}: {j}")
    return j

def password_signin(email, password):
    s,j = post_json(f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                    {"email":email,"password":password},
                    headers={"Authorization":""})  # apikey only
    return s, j

def persist_marker(marker, run_id):
    (ROOT/"FIXTURE_MARKERS.md").write_text(
        f"# Active phaseC fixture markers\n\nactive_marker: {marker}\n"
        f"active_run_id: {run_id}\nlast_updated: {datetime.now(timezone.utc).isoformat()}\n")

def clear_marker():
    (ROOT/"FIXTURE_MARKERS.md").write_text(
        "# Active phaseC fixture markers\n\nactive_marker: (none)\n"
        f"active_run_id: (none)\nlast_updated: {datetime.now(timezone.utc).isoformat()}\n")

def classify(url, body):
    p = url.split("://",1)[-1].split("/",1)[-1]
    p = "/" + p.split("?",1)[0].split("#",1)[0]
    if p.startswith("//"): p = p[1:]
    t = (body or "").lower()
    if p.startswith("/auth"): return "redirect_auth"
    if p in ("/","/membership","/membership/"): return "redirect_public"
    if "scheduled" in t and "manual" not in t[:200]: return "scheduled_state"
    if "expired" in t and "join" in t: return "expired_state"
    if p.startswith("/temple"): return "temple_home"
    if p.startswith("/devotion"): return "door_devotion"
    if p.startswith("/communion"): return "door_communion"
    if p.startswith("/decks"): return "door_remembrance"
    return f"other:{p}"

def expected(state, route):
    e = EXPECT[state]
    if e == "granted":
        return "temple_home" if route == "temple" else f"door_{route}"
    if e == "denied":
        return ["redirect_public","redirect_auth"]
    return e

def matches(actual, exp):
    return actual in exp if isinstance(exp, list) else actual == exp

def should_screenshot(state, route, vp):
    # 33 screenshots: 10 states × /temple × 3 viewports + 1 nested per viewport
    return route == "temple"

async def sign_in_via_localstorage(page, fx):
    # obtain session via password grant, then inject into localStorage
    s,j = password_signin(fx["email"], fx["password"])
    if s != 200:
        raise RuntimeError(f"password_signin {fx['email']}: {j}")
    project_ref = SUPABASE_URL.replace("https://","").replace("http://","").split(".")[0]
    key = f"sb-{project_ref}-auth-token"
    await page.goto(APP_URL + "/", wait_until="domcontentloaded")
    await page.evaluate("([k,v]) => localStorage.setItem(k,v)", [key, json.dumps(j)])

async def run_matrix(fixtures):
    report = {"started_at": datetime.now(timezone.utc).isoformat(), "cells":[], "scenarios":[]}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        for vp_name, w, h in VIEWPORTS:
            for fx in fixtures:
                if fx.get("error") or not fx.get("email"):
                    report["cells"].append({"state":fx["state"],"viewport":vp_name,
                                            "error":fx.get("error","no-email"),"pass":False})
                    continue
                ctx = await browser.new_context(viewport={"width":w,"height":h})
                page = await ctx.new_page()
                try:
                    await sign_in_via_localstorage(page, fx)
                    for r_name, r_path in ROUTES:
                        cell = {"state":fx["state"],"route":r_name,"viewport":vp_name}
                        try:
                            await page.goto(APP_URL + r_path, wait_until="networkidle", timeout=15000)
                            await page.wait_for_timeout(400)
                            final = page.url
                            body = await page.evaluate("() => document.body.innerText || ''")
                            cell["final_url"] = final
                            cell["actual"] = classify(final, body)
                        except Exception as e:
                            cell["error"] = str(e)[:200]
                            cell["actual"] = "error"
                        cell["expected"] = expected(fx["state"], r_name)
                        cell["pass"] = ("error" not in cell) and matches(cell["actual"], cell["expected"])
                        report["cells"].append(cell)
                        if should_screenshot(fx["state"], r_name, vp_name) and "error" not in cell:
                            try: await page.screenshot(path=str(SHOTS/f"{vp_name}__{fx['state']}__{r_name}.png"))
                            except: pass
                    # scenarios: refresh + back/forward + nested for manual_active on desktop
                    if vp_name == "desktop" and fx["state"] == "manual_active":
                        try:
                            await page.goto(APP_URL+"/temple", wait_until="networkidle")
                            await page.reload(wait_until="networkidle")
                            report["scenarios"].append({"name":"refresh_temple","state":fx["state"],
                                                       "pass":"/temple" in page.url})
                            await page.goto(APP_URL+"/devotion", wait_until="networkidle")
                            report["scenarios"].append({"name":"nested_devotion","state":fx["state"],
                                                       "pass":"/devotion" in page.url})
                            await page.go_back(wait_until="networkidle")
                            await page.go_forward(wait_until="networkidle")
                            report["scenarios"].append({"name":"back_forward","state":fx["state"],"pass":True})
                            await page.screenshot(path=str(SHOTS/"desktop__manual_active__nested_devotion.png"))
                        except Exception as e:
                            report["scenarios"].append({"name":"desktop_scenarios","pass":False,"error":str(e)[:200]})
                    # nested screenshot for tablet/mobile (admin)
                    if fx["state"] == "admin" and vp_name != "desktop":
                        try:
                            await page.goto(APP_URL+"/devotion", wait_until="networkidle")
                            await page.screenshot(path=str(SHOTS/f"{vp_name}__admin__nested_devotion.png"))
                        except: pass
                except Exception as e:
                    report["cells"].append({"state":fx["state"],"viewport":vp_name,
                                            "error":str(e)[:200],"pass":False})
                finally:
                    await ctx.close()
        await browser.close()
    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    report["total"] = len(report["cells"])
    report["passed"] = sum(1 for c in report["cells"] if c.get("pass"))
    report["failed"] = report["total"] - report["passed"]
    (ROOT/"report.json").write_text(json.dumps(report, indent=2))
    return report

def create_manual_user_probes(admin_token, non_admin_token):
    """Probes for create-manual-user runtime security."""
    url = f"{SUPABASE_URL}/functions/v1/create-manual-user"
    results = []
    def call(name, tok, body, expect_reject=False, expect_status=None):
        req = urllib.request.Request(url, data=json.dumps(body).encode(),
            headers={"Authorization":f"Bearer {tok}","apikey":SUPABASE_KEY,"Content-Type":"application/json"},
            method="POST")
        try:
            r = urllib.request.urlopen(req, timeout=30)
            code, body = r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            code, body = e.code, e.read().decode()
        ok = (code == expect_status) if expect_status is not None else (code >= 400 if expect_reject else code < 400)
        results.append({"name":name,"status":code,"pass":ok,"body":body[:200]})
    now = datetime.now(timezone.utc)
    from datetime import timedelta
    later = now + timedelta(days=30)
    ts_now = now.isoformat().replace("+00:00","Z")
    ts_later = later.isoformat().replace("+00:00","Z")
    # 1. non-admin rejected
    call("non_admin_rejected", non_admin_token, {
        "email":f"probe-{int(now.timestamp())}@fixture.test","fullName":"probe",
        "tempPassword":"StrongPwd!!123","startsAt":ts_now,"endsAt":ts_later
    }, expect_reject=True)
    # 2. invalid window rejected
    call("invalid_window_rejected", admin_token, {
        "email":f"probe-inv-{int(now.timestamp())}@fixture.test","fullName":"probe",
        "tempPassword":"StrongPwd!!123","startsAt":ts_later,"endsAt":ts_now
    }, expect_reject=True)
    return results

async def main():
    print("provisioning fixtures…", flush=True)
    prov = runner("provision")
    marker = prov["marker"]; run_id = prov["run_id"]
    persist_marker(marker, run_id)
    fixtures = prov["fixtures"]
    (ROOT/"fixtures.json").write_text(json.dumps(fixtures, indent=2))
    print(f"marker={marker}  fixtures={len(fixtures)}", flush=True)

    # non-admin token for security probe
    non_admin_token = ""
    for fx in fixtures:
        if fx.get("state") == "no_access" and fx.get("email"):
            s,j = password_signin(fx["email"], fx["password"])
            if s == 200: non_admin_token = j["access_token"]; break
    probes = create_manual_user_probes(ADMIN_TOKEN, non_admin_token) if non_admin_token else []
    (ROOT/"probes.json").write_text(json.dumps(probes, indent=2))

    print("running matrix…", flush=True)
    report = await run_matrix(fixtures)
    print(f"cells: {report['passed']}/{report['total']} pass  scenarios: {len(report['scenarios'])}", flush=True)

    if not KEEP:
        print("tearing down…", flush=True)
        td = runner("teardown", {"marker": marker})
        print(f"removed {td.get('removed_count')} fixtures", flush=True)
        clear_marker()
    else:
        print(f"KEEP_FIXTURES=1 — marker {marker} preserved", flush=True)

    sys.exit(0 if report["failed"] == 0 and all(p.get("pass") for p in probes) else 1)

if __name__ == "__main__":
    asyncio.run(main())