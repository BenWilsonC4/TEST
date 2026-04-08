import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Calculator, Info, MapPin, Search, Building2, HeartPulse, Briefcase, Landmark } from "lucide-react";

const AREA_PRESETS = {
  "great-britain": { label: "Great Britain", local: 22, day: 44, night: 92 },
  england: { label: "England", local: 22, day: 44, night: 93 },
  hertfordshire: { label: "Hertfordshire", local: 13, day: 26, night: 72 },
  "greater-london": { label: "Greater London", local: 21, day: 42, night: 118 },
  oxfordshire: { label: "Oxfordshire", local: 27, day: 53, night: 105 },
  custom: { label: "Custom values", local: 22, day: 44, night: 93 },
};

const ONSITE_PROXY = {
  small: 4.06,
  medium: 7.5,
  large: 12.71,
  largest: 21.93,
};

const EMPLOYMENT_TURNOVER_PER_LOCAL_FTE = 25967;

const PLACE_LIBRARY = {
  "east-herts": {
    town: "Hertford",
    district: "East Hertfordshire",
    county: "Hertfordshire",
    combinedAuthority: "None currently",
    icb: "Hertfordshire and West Essex ICB",
    deprivation: "East Herts is among the least deprived districts nationally, but local evidence notes less affluent pockets and variations in outcomes.",
    labourMarket: {
      employmentRate: "80.6% employment rate",
      fullTimePay: "£857.20 median weekly full-time pay",
      note: "County employment is high, but real-terms growth has been broadly flat and productivity pressures remain.",
    },
    visitorEconomy: {
      annualVisits: "630,800 visits to Hertford",
      annualSpend: "£52.8m visitor spend",
      note: "Hertford’s tourism strategy positions the town as a cultural and heritage destination where growth should benefit residents, businesses and the environment.",
    },
    skills: {
      note: "Local policy emphasis is on workforce development, employability, digital capability and progression pathways for young people.",
    },
    health: {
      note: "Local system priorities include prevention, improved mental wellbeing, reduced isolation and helping an ageing population stay healthier for longer.",
    },
    policyLibrary: [
      {
        type: "Economic development",
        title: "Hertfordshire Futures Business Intelligence Report",
        priority: "Sustain local economic activity, skills and productivity",
        matchRules: ["visitorSpending", "localSpend", "jobs"],
      },
      {
        type: "Tourism / place",
        title: "Hertford Sustainable Tourism Strategy 2025–2028",
        priority: "Grow Hertford’s visitor economy through inclusive, sustainable cultural and heritage tourism",
        matchRules: ["visitorSpending", "visitors", "townCentre"],
      },
      {
        type: "Culture",
        title: "East Herts Cultural Strategy 2021–2025",
        priority: "Increase cultural engagement, support local assets and widen participation",
        matchRules: ["children", "visitors", "community"],
      },
      {
        type: "Health",
        title: "Hertfordshire and West Essex ICB priorities",
        priority: "Support prevention, mental wellbeing, reduced isolation and healthier communities",
        matchRules: ["wellbeing", "community", "children"],
      },
    ],
  },
};

function currency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function number(value, digits = 0) {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function getMuseumSize(visitors) {
  if (visitors <= 20000) return "small";
  if (visitors <= 50000) return "medium";
  if (visitors <= 100000) return "large";
  return "largest";
}

function normalisePostcode(postcode) {
  return String(postcode || "").replace(/\s+/g, "").toUpperCase();
}

function lookupPlace(postcode, selectedArea) {
  const normalised = normalisePostcode(postcode);
  if (normalised.startsWith("SG13") || normalised.startsWith("SG14") || selectedArea === "hertfordshire") {
    return PLACE_LIBRARY["east-herts"];
  }
  return null;
}

function getPriorityMatches(results, place) {
  if (!place) return [];

  const signals = {
    visitorSpending: results.offsiteVisitorImpact > 0,
    visitors: results.adultVisitors > 0,
    townCentre: results.offsiteVisitorImpact > 250000,
    jobs: results.localFte > 0,
    localSpend: results.localProcurementImpact > 0 || results.employmentImpact > 0,
    children: results.educationParticipants > 0,
    wellbeing: results.wellbeingParticipants > 0,
    community: results.educationParticipants > 0 || results.wellbeingParticipants > 0,
  };

  return place.policyLibrary
    .map((policy) => ({
      ...policy,
      matched: policy.matchRules.filter((rule) => signals[rule]).length,
    }))
    .filter((policy) => policy.matched > 0)
    .sort((a, b) => b.matched - a.matched);
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildReport({ museumName, postcode, areaLabel, results, place, matchedPolicies }) {
  const placeText = place
    ? `${place.town} sits within ${place.district}, ${place.county}. Local context includes ${place.visitorEconomy.annualVisits}, ${place.visitorEconomy.annualSpend}, ${place.labourMarket.employmentRate} and ${place.labourMarket.fullTimePay}.`
    : "No local place profile has been resolved yet.";

  const policyText = matchedPolicies.length
    ? matchedPolicies.map((p, i) => `${i + 1}. ${p.title} – ${p.priority}`).join("\n")
    : "No local policy matches have been generated yet.";

  return `${museumName}\nShort Impact Report\n\nExecutive summary\n${museumName} is estimated to support ${currency(results.totalGrossImpact)} of gross local economic impact using the AIM Part A method. This includes ${currency(results.offsiteVisitorImpact)} in off-site visitor spending, ${currency(results.employmentImpact)} in employment-related turnover and ${currency(results.localProcurementImpact)} in local goods and services spending.\n\nMethodology and assumptions\nThis summary uses the AIM gross impact method only. Visitor impacts are based on adult visitors and ${areaLabel} visitor spend assumptions. Off-site visitor impact is calculated by deducting on-site revenue from gross visitor impacts. Employment impact is estimated using local FTE multiplied by ${currency(EMPLOYMENT_TURNOVER_PER_LOCAL_FTE)} per local FTE. Goods and services impact is calculated from the local share of non-staff spend.\n\nEconomic impact\n- Off-site visitor impact: ${currency(results.offsiteVisitorImpact)}\n- Employment impact: ${currency(results.employmentImpact)}\n- Goods and services impact: ${currency(results.localProcurementImpact)}\n- Total gross impact: ${currency(results.totalGrossImpact)}\n\nSocial value\nThis MVP focuses on the AIM economic model. Social value figures are not yet calculated, but current reach inputs include ${number(results.educationParticipants)} children reached and ${number(results.wellbeingParticipants)} wellbeing participants for future matching and module development.\n\nLocal context\n${placeText}\n\nStrategic alignment\n${policyText}\n\nReturn on investment\nThis MVP reports gross impact only and does not yet calculate a net additionality-based return on investment.\n\nEvidence caveats\nThis report is generated from the AIM gross impact model and a seeded local place library. It is a concept demonstration rather than a final externally assured impact report.`;
}

export default function AimEconomicImpactDashboard() {
  const [selectedModel, setSelectedModel] = useState("aim-economic-impact");
  const [museumName, setMuseumName] = useState("Example Museum");
  const [postcode, setPostcode] = useState("SG14 1AB");
  const [area, setArea] = useState("hertfordshire");
  const [customLocal, setCustomLocal] = useState(13);
  const [customDay, setCustomDay] = useState(26);
  const [customNight, setCustomNight] = useState(72);
  const [visitors, setVisitors] = useState(33000);
  const [adultShare, setAdultShare] = useState(75);
  const [localPct, setLocalPct] = useState(65);
  const [dayPct, setDayPct] = useState(30);
  const [overnightPct, setOvernightPct] = useState(5);
  const [useProxyOnsiteSpend, setUseProxyOnsiteSpend] = useState(false);
  const [onsiteSpend, setOnsiteSpend] = useState(7.5);
  const [fte, setFte] = useState(10);
  const [localStaffPct, setLocalStaffPct] = useState(70);
  const [goodsServicesSpend, setGoodsServicesSpend] = useState(635000);
  const [localProcurementPct, setLocalProcurementPct] = useState(15.75);
  const [educationParticipants, setEducationParticipants] = useState(1000);
  const [wellbeingParticipants, setWellbeingParticipants] = useState(2000);

  const size = getMuseumSize(visitors);
  const preset = AREA_PRESETS[area];
  const spendMetrics = area === "custom"
    ? { local: customLocal, day: customDay, night: customNight }
    : { local: preset.local, day: preset.day, night: preset.night };
  const areaLabel = area === "custom" ? "custom" : preset.label;
  const calculatedOnsiteSpend = useProxyOnsiteSpend ? ONSITE_PROXY[size] : onsiteSpend;

  const results = useMemo(() => {
    const adultVisitors = visitors * (adultShare / 100);
    const totalPct = localPct + dayPct + overnightPct;
    const normalizedLocal = totalPct > 0 ? localPct / totalPct : 0;
    const normalizedDay = totalPct > 0 ? dayPct / totalPct : 0;
    const normalizedOvernight = totalPct > 0 ? overnightPct / totalPct : 0;

    const localVisitors = adultVisitors * normalizedLocal;
    const dayVisitors = adultVisitors * normalizedDay;
    const overnightVisitors = adultVisitors * normalizedOvernight;

    const grossVisitorImpact =
      localVisitors * spendMetrics.local +
      dayVisitors * spendMetrics.day +
      overnightVisitors * spendMetrics.night;

    const onsiteRevenue = visitors * calculatedOnsiteSpend;
    const offsiteVisitorImpact = Math.max(grossVisitorImpact - onsiteRevenue, 0);
    const localFte = fte * (localStaffPct / 100);
    const employmentImpact = localFte * EMPLOYMENT_TURNOVER_PER_LOCAL_FTE;
    const localProcurementImpact = goodsServicesSpend * (localProcurementPct / 100);
    const totalGrossImpact = offsiteVisitorImpact + employmentImpact + localProcurementImpact;

    return {
      adultVisitors,
      localVisitors,
      dayVisitors,
      overnightVisitors,
      grossVisitorImpact,
      onsiteRevenue,
      offsiteVisitorImpact,
      localFte,
      employmentImpact,
      localProcurementImpact,
      totalGrossImpact,
      educationParticipants,
      wellbeingParticipants,
    };
  }, [visitors, adultShare, localPct, dayPct, overnightPct, spendMetrics, calculatedOnsiteSpend, fte, localStaffPct, goodsServicesSpend, localProcurementPct, educationParticipants, wellbeingParticipants]);

  const resolvedPlace = useMemo(() => lookupPlace(postcode, area), [postcode, area]);
  const matchedPolicies = useMemo(() => getPriorityMatches(results, resolvedPlace), [results, resolvedPlace]);
  const generatedReport = useMemo(
    () => buildReport({ museumName, postcode, areaLabel, results, place: resolvedPlace, matchedPolicies }),
    [museumName, postcode, areaLabel, results, resolvedPlace, matchedPolicies]
  );

  const mixTotal = localPct + dayPct + overnightPct;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">AIM Economic Impact Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              A focused MVP for the AIM economic impact model with a short report generator and seeded place and policy context.
            </p>
          </div>
          <Button onClick={() => downloadTextFile(generatedReport, "short-impact-report.txt")} className="gap-2">
            <Download className="h-4 w-4" />
            Download short report
          </Button>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Prototype scope</AlertTitle>
          <AlertDescription>
            This version is focused on AIM Part A gross economic impact and a short generated report. The place and policy layer is seeded for Hertford / East Herts / Hertfordshire as a proof of concept.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="inputs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="discovery">Data discovery</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="place">Place & policy</TabsTrigger>
            <TabsTrigger value="report">Short report</TabsTrigger>
            <TabsTrigger value="method">Method</TabsTrigger>
          </TabsList>

          <TabsContent value="discovery" className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Data discovery</CardTitle>
                <CardDescription>
                  Start by identifying what data the organisation already holds. The platform can then suggest which models are relevant. In this prototype, only the AIM economic impact model is currently available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>How discovery works</AlertTitle>
                  <AlertDescription>
                    Rather than starting with a long list of indicators, the app begins with a short set of questions about the data the organisation already collects. Based on the answers, the platform indicates which models can be explored.
                  </AlertDescription>
                </Alert>

                <div className="rounded-2xl border bg-white p-5">
                  <div className="mb-4 text-base font-medium text-slate-900">Simple data discovery questions</div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-900">Organisation and operations</div>
                      <DiscoveryQuestion label="Do you record your organisation’s annual income or expenditure?" checked={true} />
                      <DiscoveryQuestion label="Do you know your staff numbers or full-time equivalent (FTE) staff?" checked={true} />
                      <DiscoveryQuestion label="Do you record your annual wage bill?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you know approximately how much of your spending goes to local suppliers?" checked={true} />
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-900">Visitors and audiences</div>
                      <DiscoveryQuestion label="Do you record annual visitor or audience numbers?" checked={true} />
                      <DiscoveryQuestion label="Do you know where your visitors come from, for example local, day visitors or tourists?" checked={true} />
                      <DiscoveryQuestion label="Do you collect information on audience participation in events, activities or exhibitions?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you record school visits or education group visits?" checked={false} disabled />
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-900">Learning and skills</div>
                      <DiscoveryQuestion label="Do you record how many children or young people participate in learning programmes?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you provide apprenticeships, traineeships or work placements?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you track volunteer numbers or volunteer hours?" checked={false} disabled />
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-900">Health and community</div>
                      <DiscoveryQuestion label="Do you run health, wellbeing or social prescribing programmes?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you record participant numbers for these activities?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you collect any survey data on wellbeing outcomes?" checked={false} disabled />
                      <DiscoveryQuestion label="Do you record participation from specific community groups or priority audiences?" checked={false} disabled />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-5">
                  <div className="mb-3 text-base font-medium text-slate-900">Models suggested by your current data</div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selectedModel === "aim-economic-impact"}
                        onChange={() => setSelectedModel("aim-economic-impact")}
                      />
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">AIM economic impact model</div>
                        <div className="text-sm text-slate-600">
                          Available because you have core data on visitors, visitor origin, expenditure, staff and local procurement.
                        </div>
                        <div className="text-xs text-slate-500">
                          Outputs include gross visitor impact, off-site visitor impact, employment impact, goods and services impact, and total gross impact.
                        </div>
                      </div>
                    </label>

                    <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-slate-500">
                      Other models such as wellbeing, education and community value are not yet available in this prototype. These would be activated once agreed frameworks and assumptions are added to the platform.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inputs" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Organisation and geography</CardTitle>
                  <CardDescription>Enter the museum name, postcode and AIM area basis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Museum name</Label>
                    <Input value={museumName} onChange={(e) => setMuseumName(e.target.value)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Postcode</Label>
                      <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="e.g. SG14 1AB" />
                    </div>
                    <div className="space-y-2">
                      <Label>Area lookup</Label>
                      <Select value={area} onValueChange={setArea}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AREA_PRESETS).map(([key, value]) => (
                            <SelectItem key={key} value={key}>{value.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {area === "custom" && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label>Local spend</Label><Input type="number" value={customLocal} onChange={(e) => setCustomLocal(Number(e.target.value))} /></div>
                      <div className="space-y-2"><Label>Day spend</Label><Input type="number" value={customDay} onChange={(e) => setCustomDay(Number(e.target.value))} /></div>
                      <div className="space-y-2"><Label>Overnight spend</Label><Input type="number" value={customNight} onChange={(e) => setCustomNight(Number(e.target.value))} /></div>
                    </div>
                  )}
                  <div className="rounded-xl border bg-white p-4 text-sm text-slate-700">
                    <div className="mb-2 flex items-center gap-2 font-medium"><MapPin className="h-4 w-4" /> Current spend metrics</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>Local: <strong>{currency(spendMetrics.local)}</strong></div>
                      <div>Day: <strong>{currency(spendMetrics.day)}</strong></div>
                      <div>Overnight: <strong>{currency(spendMetrics.night)}</strong></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Visitor inputs</CardTitle>
                  <CardDescription>Part A1 uses adult visitors split into local, day and overnight categories.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Annual visitors</Label><Input type="number" value={visitors} onChange={(e) => setVisitors(Number(e.target.value))} /></div>
                    <div className="space-y-2"><Label>Adult visitor share (%)</Label><Input type="number" value={adultShare} onChange={(e) => setAdultShare(Number(e.target.value))} /></div>
                  </div>
                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="text-sm font-medium">Adult visitor mix (%)</div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2"><Label>Local</Label><Input type="number" value={localPct} onChange={(e) => setLocalPct(Number(e.target.value))} /></div>
                      <div className="space-y-2"><Label>Day</Label><Input type="number" value={dayPct} onChange={(e) => setDayPct(Number(e.target.value))} /></div>
                      <div className="space-y-2"><Label>Overnight</Label><Input type="number" value={overnightPct} onChange={(e) => setOvernightPct(Number(e.target.value))} /></div>
                    </div>
                    <div className="text-xs text-slate-500">Current total: {number(mixTotal)}%. The app normalises the mix if it does not equal 100%.</div>
                  </div>
                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">On-site spend per visitor</div>
                        <div className="text-xs text-slate-500">Use your own figure or AIM size proxy.</div>
                      </div>
                      <Button type="button" variant={useProxyOnsiteSpend ? "default" : "outline"} onClick={() => setUseProxyOnsiteSpend(!useProxyOnsiteSpend)}>
                        {useProxyOnsiteSpend ? "Using proxy" : "Use proxy"}
                      </Button>
                    </div>
                    {useProxyOnsiteSpend ? (
                      <div className="text-sm text-slate-700">
                        Size band: <Badge variant="secondary" className="ml-2 capitalize">{size}</Badge>
                        <div className="mt-2">Proxy on-site spend: <strong>{currency(ONSITE_PROXY[size])}</strong></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Average on-site spend (£)</Label>
                        <Input type="number" step="0.01" value={onsiteSpend} onChange={(e) => setOnsiteSpend(Number(e.target.value))} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle>Employment</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>FTE staff</Label><Input type="number" value={fte} onChange={(e) => setFte(Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Local staff (%)</Label><Input type="number" value={localStaffPct} onChange={(e) => setLocalStaffPct(Number(e.target.value))} /></div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader><CardTitle>Goods & services</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Goods & services spend (£)</Label><Input type="number" value={goodsServicesSpend} onChange={(e) => setGoodsServicesSpend(Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Local procurement (%)</Label><Input type="number" step="0.01" value={localProcurementPct} onChange={(e) => setLocalProcurementPct(Number(e.target.value))} /></div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Additional reach</CardTitle>
                  <CardDescription>Used only for place and policy matching in this MVP.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Children reached</Label><Input type="number" value={educationParticipants} onChange={(e) => setEducationParticipants(Number(e.target.value))} /></div>
                  <div className="space-y-2"><Label>Wellbeing participants</Label><Input type="number" value={wellbeingParticipants} onChange={(e) => setWellbeingParticipants(Number(e.target.value))} /></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total gross impact" value={currency(results.totalGrossImpact)} subtitle="TOTAL A" />
              <StatCard title="Off-site visitor impact" value={currency(results.offsiteVisitorImpact)} subtitle="Level A1(II)" />
              <StatCard title="Employment impact" value={currency(results.employmentImpact)} subtitle="Level A2" />
              <StatCard title="Goods & services impact" value={currency(results.localProcurementImpact)} subtitle="Level A3" />
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Calculation breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Row label="Adult visitors used in A1" value={number(results.adultVisitors)} />
                <Row label="Local adult visitors" value={number(results.localVisitors)} />
                <Row label="Day adult visitors" value={number(results.dayVisitors)} />
                <Row label="Overnight adult visitors" value={number(results.overnightVisitors)} />
                <Separator />
                <Row label="Level A1(I) Gross visitor impact" value={currency(results.grossVisitorImpact)} />
                <Row label="On-site revenue deducted" value={currency(results.onsiteRevenue)} />
                <Row label="Level A1(II) Off-site visitor impact" value={currency(results.offsiteVisitorImpact)} />
                <Separator />
                <Row label="Level A2 Employment impact" value={currency(results.employmentImpact)} />
                <Row label="Level A3 Local goods & services impact" value={currency(results.localProcurementImpact)} />
                <Separator />
                <Row label="TOTAL A Overall Gross Impact" value={currency(results.totalGrossImpact)} strong />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="place" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle>Resolved place context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  {resolvedPlace ? (
                    <>
                      <div><strong>Town:</strong> {resolvedPlace.town}</div>
                      <div><strong>District / borough:</strong> {resolvedPlace.district}</div>
                      <div><strong>County:</strong> {resolvedPlace.county}</div>
                      <div><strong>Combined authority:</strong> {resolvedPlace.combinedAuthority}</div>
                      <div><strong>ICS / ICB geography:</strong> {resolvedPlace.icb}</div>
                      <div><strong>Deprivation profile:</strong> {resolvedPlace.deprivation}</div>
                    </>
                  ) : (
                    <div>No seeded place match yet. Use a Hertford postcode like SG13 or SG14, or choose Hertfordshire.</div>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle>Local economic and tourism context</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <InfoPanel icon={Briefcase} title="Labour market" lines={resolvedPlace ? [resolvedPlace.labourMarket.employmentRate, resolvedPlace.labourMarket.fullTimePay, resolvedPlace.labourMarket.note] : ["No data loaded"]} />
                  <InfoPanel icon={Building2} title="Visitor economy" lines={resolvedPlace ? [resolvedPlace.visitorEconomy.annualVisits, resolvedPlace.visitorEconomy.annualSpend, resolvedPlace.visitorEconomy.note] : ["No data loaded"]} />
                  <InfoPanel icon={HeartPulse} title="Health profile" lines={resolvedPlace ? [resolvedPlace.health.note] : ["No data loaded"]} />
                  <InfoPanel icon={Landmark} title="Skills and place" lines={resolvedPlace ? [resolvedPlace.skills.note] : ["No data loaded"]} />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Policy matching</CardTitle>
                <CardDescription>Outputs are matched against a seeded local policy library.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matchedPolicies.length ? matchedPolicies.map((policy) => (
                  <div key={policy.title} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{policy.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{policy.priority}</div>
                      </div>
                      <Badge>{policy.type}</Badge>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-600">No policy matches are available until a recognised place is selected.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Short generated report</CardTitle>
                <CardDescription>A concise single-document summary combining impact, local context and alignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border bg-white p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{generatedReport}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="method" className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Method summary</CardTitle>
                <CardDescription>What this MVP includes from the AIM model and place layer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-slate-700">
                <MethodBlock title="Level A1(I) Gross visitor impacts" body="Adult visitors are split into local, day and overnight groups. Each group is multiplied by the relevant area spend metric." formula="gross visitor impact = (local adult visitors × local spend) + (day adult visitors × day spend) + (overnight adult visitors × spend per night)" />
                <MethodBlock title="Level A1(II) Off-site visitor impacts" body="The model subtracts on-site revenue from gross visitor impacts to estimate spending beyond the museum itself." formula="off-site visitor impact = gross visitor impact − (total visitors × on-site spend per visitor)" />
                <MethodBlock title="Level A2 Employment impacts" body="Local FTE staff are multiplied by the AIM employment turnover figure." formula={`employment impact = local FTE × ${currency(EMPLOYMENT_TURNOVER_PER_LOCAL_FTE)}`} />
                <MethodBlock title="Level A3 Goods and services impacts" body="Only the local share of non-staff spend is counted in this gross model." formula="goods and services impact = goods & services spend × local procurement %" />
                <MethodBlock title="Place and policy layer" body="The postcode and selected authority resolve a local context profile. Organisational outputs are then matched against tagged local policy priorities." formula="postcode / authority → place profile → tagged priorities → matched summary" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-6">
        <div className="text-sm text-slate-500">{title}</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-600"}>{label}</span>
      <span className={strong ? "font-semibold text-slate-900" : "font-medium text-slate-900"}>{value}</span>
    </div>
  );
}

function MethodBlock({ title, body, formula }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-2 font-medium text-slate-900"><Calculator className="h-4 w-4" /> {title}</div>
      <p className="mb-3 text-slate-600">{body}</p>
      <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800">{formula}</div>
    </div>
  );
}

function DiscoveryQuestion({ label, checked = false, disabled = false }) {
  return (
    <label className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${disabled ? "bg-slate-50 text-slate-500" : "bg-white text-slate-700"}`}>
      <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled} readOnly />
      <span>{label}</span>
    </label>
  );
}

function InfoPanel({ icon: Icon, title, lines }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-center gap-2 font-medium text-slate-900"><Icon className="h-4 w-4" /> {title}</div>
      <div className="space-y-2 text-sm text-slate-700">
        {lines.map((line) => <div key={line}>{line}</div>)}
      </div>
    </div>
  );
}
