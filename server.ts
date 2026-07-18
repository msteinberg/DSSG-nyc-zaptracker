import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Endpoint 1: Fetch active ULURP projects live from Socrata with filters and search
app.get("/api/projects", async (req, res) => {
  try {
    const { borough, q } = req.query;

    let socrataUrl = "https://data.cityofnewyork.us/resource/hgx4-8ukb.json?ulurp_non=ULURP";

    // Build filters
    const filters: string[] = [];
    if (borough && borough !== "all" && typeof borough === "string") {
      filters.push(`borough='${borough}'`);
    }

    let finalUrl = socrataUrl;
    if (filters.length > 0) {
      finalUrl += "&" + filters.join("&");
    }

    // Always only include projects that have public_status of "Noticed" or "In Public Review"
    finalUrl += `&%24where=${encodeURIComponent("public_status='Noticed' or public_status='In Public Review'")}`;

    if (q && typeof q === "string") {
      finalUrl += `&%24q=${encodeURIComponent(q.trim())}`;
    }

    // Sort by project_id DESC to get newest first, pull up to 2000 to find enough matches after keyword filtering
    finalUrl += `&%24order=project_id%20desc&%24limit=2000`;

    console.log(`Querying Socrata ZAP Projects URL: ${finalUrl}`);
    const socrataRes = await fetch(finalUrl, {
      headers: { "User-Agent": "aistudio-build-cpc" }
    });

    if (!socrataRes.ok) {
      throw new Error(`Socrata responded with status ${socrataRes.status}`);
    }

    let projects = await socrataRes.json();
    if (Array.isArray(projects)) {
      const keywords = [
        "affordable",
        "income-restricted",
        "income restricted",
        "mandatory inclusionary",
        "mih",
        "hdfc",
        "supportive housing",
        "workforce housing",
        "income-eligible",
        "low-income",
        "low income",
        "deep affordability",
        "permanently affordable"
      ];

      projects = projects.filter((p: any) => {
        // Enforce public_status match
        const pStatus = (p.public_status || "").toLowerCase().trim();
        const matchesStatus = pStatus === "noticed" || pStatus === "in public review";
        if (!matchesStatus) return false;

        // Enforce affordable housing keywords in description
        const brief = (p.project_brief || "").toLowerCase();
        return keywords.some(keyword => brief.includes(keyword));
      });

      // Slice to keep payload optimal
      projects = projects.slice(0, 150);
    }
    res.json(projects);
  } catch (error: any) {
    console.error("Error fetching projects from Socrata:", error);
    res.status(500).json({ error: error.message || "Failed to fetch projects from Socrata." });
  }
});

// Helper to programmatically extract all ZAP project URLs from a PDF buffer using pdfjs-dist
async function extractProjectUrlsFromPdf(buffer: Buffer): Promise<string[]> {
  try {
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const urls: string[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const annotations = await page.getAnnotations();
      for (const annot of annotations) {
        if (annot.subtype === "Link" && annot.url) {
          const cleanUrl = annot.url.trim();
          if (cleanUrl.includes("zap.planning.nyc.gov/projects")) {
            urls.push(cleanUrl);
          }
        }
      }
    }
    return Array.from(new Set(urls));
  } catch (err) {
    console.error("Error programmatically extracting URLs from PDF:", err);
    return [];
  }
}

// Helper to parse double-quoted CSV fields correctly
function parseCSV(csvText: string): any[] {
  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === '\n' && !insideQuotes) {
      lines.push(currentLine);
      currentLine = "";
    } else if (char === '\r' && !insideQuotes) {
      // ignore
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const records: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const record: any = {};
      headers.forEach((h, idx) => {
        record[h.trim()] = values[idx]?.trim();
      });
      records.push(record);
    }
  }
  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

let displacementRiskCache: any[] = [];
let lastFetchedRiskTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function getDisplacementRiskData(): Promise<any[]> {
  const now = Date.now();
  if (displacementRiskCache.length > 0 && (now - lastFetchedRiskTime < CACHE_TTL)) {
    return displacementRiskCache;
  }
  
  try {
    const sheetId = '1T3g3-AmDIzB7dsnmOd9jSe4-FLDgnVSOq_FldKyRT9U';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    console.log(`Fetching Displacement Risk data from Google Sheet: ${csvUrl}`);
    const res = await fetch(csvUrl, {
      headers: { "User-Agent": "aistudio-build-cpc" }
    });
    if (res.ok) {
      const text = await res.text();
      displacementRiskCache = parseCSV(text);
      lastFetchedRiskTime = now;
      console.log(`Successfully loaded ${displacementRiskCache.length} displacement risk records.`);
    } else {
      console.warn(`Failed to fetch displacement risk Google Sheet. Status: ${res.status}`);
    }
  } catch (err) {
    console.error("Error fetching/parsing displacement risk sheet:", err);
  }
  
  return displacementRiskCache;
}

async function lookupDisplacementRisks(ntaCodes: string[]): Promise<any[]> {
  const riskRecords = await getDisplacementRiskData();
  const matched: any[] = [];
  
  for (const code of ntaCodes) {
    const record = riskRecords.find(r => r.NTACode === code);
    if (record) {
      matched.push({
        ntaCode: record.NTACode,
        ntaName: record.NTAName,
        displacementRiskIndex: record.DisplacementRiskIndex,
        populationVulnerability: record.PopulationVulnerability,
        housingConditions: record.HousingConditions,
        marketPressure: record.MarketPressure,
        notWhite: record.NotWhite,
        below2xPovertyRate: record.Below2xPovertyRate,
        limitedEnglishProficiency: record.LimitedEnglishProficiency,
        severeRentBurden: record.SevereRentBurden,
        rentalHousing: record.RentalHousing,
        notIncomeRestricted: record.NotIncomeRestricted,
        occupiedRentStabilized: record.OccupiedRentStabilizedAsAShareOfAllOccupied || record.OccupiedRentStabilizedAsAShareOfAllOccupied,
        threeOrMoreHousingProblems: record['3OrMoreHousingProblems'] || record['3OrMoreHousingProblems'],
        changeInRents: record.ChangeInRents,
        salesPriceAppreciation: record.SalesPriceAppreciation,
        adjacency: record.Adjacency
      });
    }
  }
  return matched;
}

// Resolve applicant type for a ZAP Project ID via hgx4-8ukb Socrata dataset
async function resolveApplicantType(projectId: string): Promise<string> {
  const cleanId = projectId.trim();
  const idsToTry = [cleanId];
  if (cleanId.startsWith("P")) {
    idsToTry.push(cleanId.substring(1));
  } else {
    idsToTry.push("P" + cleanId);
  }

  for (const id of idsToTry) {
    try {
      const url = `https://data.cityofnewyork.us/resource/hgx4-8ukb.json?project_id=${id}`;
      console.log(`Querying ZAP-Projects for applicant_type using URL: ${url}`);
      const response = await fetch(url, {
        headers: { "User-Agent": "aistudio-build-cpc" }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const applicantType = data[0].applicant_type;
          if (applicantType) {
            return String(applicantType).trim();
          }
        }
      }
    } catch (err) {
      console.error(`Failed to query ZAP-Projects for applicant_type for id ${id}:`, err);
    }
  }
  return "Unknown";
}

// Resolve NTA and BBL info for a ZAP Project ID via Socrata datasets
async function resolveNtaForProject(projectId: string) {
  const cleanId = projectId.trim();
  const idsToTry = [cleanId];
  if (cleanId.startsWith("P")) {
    idsToTry.push(cleanId.substring(1));
  } else {
    idsToTry.push("P" + cleanId);
  }

  let bblRecords: any[] = [];
  
  // Query 2iga-a6mk.json (modern Zoning Application Portal - BBL)
  // Try with 'project_id' simple query parameter for each id to try
  for (const id of idsToTry) {
    try {
      const zapUrl = `https://data.cityofnewyork.us/resource/2iga-a6mk.json?project_id=${id}`;
      console.log(`Querying ZAP-BBL for project ${id} using URL: ${zapUrl}`);
      const response = await fetch(zapUrl, {
        headers: { "User-Agent": "aistudio-build-cpc" }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          bblRecords = data;
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to query ZAP-BBL for id ${id}:`, err);
    }
  }

  const bbls = Array.from(
    new Set(
      bblRecords
        .map(r => r.bbl)
        .filter(Boolean)
        .map((b: any) => String(b).trim())
    )
  );

  const applicantType = await resolveApplicantType(cleanId);

  // Fetch live up-to-date milestone information from official live ZAP API
  let currentMilestone: string | null = null;
  let currentMilestoneDate: string | null = null;
  let publicStatus: string | null = null;
  let certifiedReferred: string | null = null;

  try {
    const liveZapUrl = `https://zap-api-production.herokuapp.com/projects/${cleanId}`;
    console.log(`Querying live official ZAP API for real-time milestones: ${liveZapUrl}`);
    const liveRes = await fetch(liveZapUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (liveRes.ok) {
      const liveData = await liveRes.json();
      if (liveData && liveData.data && liveData.data.attributes) {
        const attr = liveData.data.attributes;
        if (attr["dcp-publicstatus"]) {
          publicStatus = attr["dcp-publicstatus"];
        }
        if (attr["dcp-certifiedreferred"]) {
          certifiedReferred = attr["dcp-certifiedreferred"];
        }
      }

      if (liveData && Array.isArray(liveData.included)) {
        const milestones = liveData.included.filter((x: any) => x.type === "milestones");
        // Filter those that have an actual end date (completed milestones)
        const completedMilestones = milestones.filter((m: any) => m.attributes && m.attributes["dcp-actualenddate"] !== null);
        if (completedMilestones.length > 0) {
          // Sort by sequence number descending to get the latest completed milestone
          completedMilestones.sort((a: any, b: any) => {
            const seqA = a.attributes["dcp-milestonesequence"] || 0;
            const seqB = b.attributes["dcp-milestonesequence"] || 0;
            return seqB - seqA;
          });
          const latestMilestone = completedMilestones[0];
          currentMilestone = latestMilestone.attributes["dcp-name"]?.trim() || latestMilestone.attributes["milestonename"]?.trim() || null;
          currentMilestoneDate = latestMilestone.attributes["dcp-actualenddate"];
          console.log(`Live Milestones Helper: project ${cleanId} resolved latest completed milestone "${currentMilestone}" on ${currentMilestoneDate}`);
        }
      }
    }
  } catch (err) {
    console.error(`Failed to query live official ZAP API for project ${cleanId}:`, err);
  }

  if (bbls.length === 0) {
    return {
      projectId: cleanId,
      bbls: "",
      ntaCode: "",
      ntaName: "",
      displacementRisks: [],
      applicantType,
      currentMilestone,
      currentMilestoneDate,
      publicStatus,
      certifiedReferred
    };
  }

  const ntaCodesSet = new Set<string>();
  const ntaNamesSet = new Set<string>();

  // Process up to 5 BBLs (to avoid too many parallel network requests)
  for (const bbl of bbls.slice(0, 5)) {
    try {
      // 1. Query PLUTO for the bct2020 census tract using the modern dataset 64uk-42ks.json
      // Socrata PLUTO stores BBLs as decimal strings (e.g. '3011920041.00000000' or '3011920041')
      const formats = [bbl, `${bbl}.00000000`];
      const formatList = formats.map(f => `'${f}'`).join(",");
      const plutoUrl = `https://data.cityofnewyork.us/resource/64uk-42ks.json?$where=bbl in(${formatList})`;
      
      console.log(`Querying PLUTO for BBL ${bbl}: ${plutoUrl}`);
      const response = await fetch(plutoUrl, {
        headers: { "User-Agent": "aistudio-build-cpc" }
      });
      
      let bct2020: string | null = null;
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          bct2020 = data[0].bct2020 || null;
        }
      }

      // If PLUTO direct BBL query returned nothing, fall back to querying PLUTO by borough/block
      if (!bct2020 && bbl.length === 10) {
        const borocode = bbl.substring(0, 1);
        const block = String(parseInt(bbl.substring(1, 6), 10));
        const plutoFallbackUrl = `https://data.cityofnewyork.us/resource/64uk-42ks.json?borocode=${borocode}&block=${block}&$limit=1`;
        console.log(`PLUTO direct BBL search failed. Trying block fallback: ${plutoFallbackUrl}`);
        const fallbackRes = await fetch(plutoFallbackUrl, {
          headers: { "User-Agent": "aistudio-build-cpc" }
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            bct2020 = fallbackData[0].bct2020 || null;
          }
        }
      }

      // 2. Query the Census Tract to NTA equivalency dataset hm78-6dwm.json to resolve NTA
      if (bct2020) {
        const equivUrl = `https://data.cityofnewyork.us/resource/hm78-6dwm.json?boroct2020=${bct2020}`;
        console.log(`Querying Equivalency table for bct2020 ${bct2020}: ${equivUrl}`);
        const equivRes = await fetch(equivUrl, {
          headers: { "User-Agent": "aistudio-build-cpc" }
        });
        if (equivRes.ok) {
          const equivData = await equivRes.json();
          if (Array.isArray(equivData) && equivData.length > 0) {
            const equivRecord = equivData[0];
            const code = equivRecord.ntacode;
            const name = equivRecord.ntaname;
            if (code) ntaCodesSet.add(String(code).trim());
            if (name) ntaNamesSet.add(String(name).trim());
          }
        }
      }
    } catch (err) {
      console.error(`Error resolving NTA for BBL ${bbl}:`, err);
    }
  }

  const displacementRisks = await lookupDisplacementRisks(Array.from(ntaCodesSet));

  return {
    projectId: cleanId,
    bbls: bbls.join(", "),
    ntaCode: Array.from(ntaCodesSet).join(", "),
    ntaName: Array.from(ntaNamesSet).join(", "),
    displacementRisks,
    applicantType,
    currentMilestone,
    currentMilestoneDate,
    publicStatus,
    certifiedReferred
  };
}

// Helper to extract or deduce a ZAP Project ID from projectUrl or ULURP numbers
function deduceProjectId(p: { projectUrl?: string | null; ulurpNos?: string[] | null; projectName?: string | null }): string | null {
  // 1. Try to extract from projectUrl if it is a valid project URL
  if (p.projectUrl) {
    try {
      const urlObj = new URL(p.projectUrl.trim());
      const pathname = urlObj.pathname;
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        // Validate that the last part is a valid project ID and not just "projects"
        if (lastPart && lastPart.toLowerCase() !== "projects") {
          return lastPart;
        }
      }
    } catch (e) {
      const parts = p.projectUrl.split("?")[0].split("#")[0].split("/").filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.toLowerCase() !== "projects") {
          return lastPart;
        }
      }
    }
  }

  // 2. Fallback: deduce project ID from ULURP numbers
  if (p.ulurpNos && Array.isArray(p.ulurpNos)) {
    for (const ulurp of p.ulurpNos) {
      if (!ulurp) continue;
      // Remove all spaces to make matching easy
      const cleanUlurp = ulurp.replace(/\s+/g, "");
      // Regex matches:
      // Group 1: 2-digit year (\d{2})
      // Group 2: 4-digit sequence (\d{4})
      // Optional dash or underscore, then letters followed by borough character [MKQXRY]
      const match = cleanUlurp.match(/[CNA]?(\d{2})(\d{4})[-_]?([A-Z]*)([MKQXRY])/i);
      if (match) {
        const yy = match[1];
        const ssss = match[2];
        const boroughChar = match[4].toUpperCase();
        const year = parseInt(yy, 10) < 50 ? `20${yy}` : `19${yy}`;
        const deducedId = `${year}${boroughChar}${ssss}`;
        console.log(`Deduction helper: mapped ULURP "${ulurp}" to ZAP Project ID "${deducedId}"`);
        return deducedId;
      }
    }
  }

  return null;
}

// Endpoint 2: Check Socrata API connection health and get catalog stats
app.get("/api/socrata-health", async (req, res) => {
  try {
    const socrataUrl = "https://data.cityofnewyork.us/resource/hgx4-8ukb.json?%24limit=1";
    console.log(`Checking Socrata API connectivity: ${socrataUrl}`);
    const socrataRes = await fetch(socrataUrl, {
      headers: { "User-Agent": "aistudio-build-cpc" }
    });

    if (socrataRes.ok) {
      res.json({
        status: "healthy",
        datasetId: "hgx4-8ukb",
        provider: "NYC Socrata Open Data Portal",
        lastSync: new Date().toISOString()
      });
    } else {
      res.status(502).json({
        status: "unreachable",
        error: `Socrata returned HTTP ${socrataRes.status}`
      });
    }
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      error: error.message || "Unknown error during health check"
    });
  }
});

// Endpoint 3: Standalone on-demand project NTA/BBL resolver
app.get("/api/resolve-project-nta", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId || typeof projectId !== "string") {
      res.status(400).json({ error: "projectId parameter is required" });
      return;
    }

    console.log(`On-demand NTA resolve request for projectId: ${projectId}`);
    const result = await resolveNtaForProject(projectId);
    res.json(result);
  } catch (error: any) {
    console.error(`Error in on-demand resolve-project-nta:`, error);
    res.status(500).json({ error: error.message || "Failed to resolve project NTA." });
  }
});

interface ScheduledProjectsCache {
  date: string;
  calendarUrl: string;
  ulurps: string[];
  projectIds: string[];
  lastFetched: number;
}
let scheduledProjectsCache: ScheduledProjectsCache | null = null;
const CALENDAR_CACHE_TTL = 60 * 60 * 1000; // 1 hour caching

function getCandidateWednesdays(currentDate: Date): Date[] {
  const dates: Date[] = [];
  // Generate Wednesdays from -21 days to +21 days to find recently published ones or soon to be
  for (let i = -21; i <= 21; i++) {
    const d = new Date(currentDate.getTime() + i * 24 * 60 * 60 * 1000);
    if (d.getDay() === 3) { // 3 is Wednesday
      dates.push(d);
    }
  }
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates;
}

async function getCPCScheduledProjects(): Promise<ScheduledProjectsCache> {
  const now = Date.now();
  if (scheduledProjectsCache && (now - scheduledProjectsCache.lastFetched < CALENDAR_CACHE_TTL)) {
    return scheduledProjectsCache;
  }

  const candidates = getCandidateWednesdays(new Date());
  let targetUrl = "";
  let targetBuffer: Buffer | null = null;

  for (const d of candidates) {
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    const DD = String(d.getDate()).padStart(2, "0");
    const url = `https://s-media.nyc.gov/agencies/dcp/assets/files/pdf/about/commission/public-meetings//${YYYY}-${MM}-${DD}cal.pdf`;
    
    console.log(`Probing CPC Calendar URL: ${url}`);
    try {
      const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": "aistudio-build-cpc" } });
      if (res.status === 200) {
        const pdfRes = await fetch(url, { headers: { "User-Agent": "aistudio-build-cpc" } });
        if (pdfRes.ok) {
          targetUrl = url;
          const arrayBuffer = await pdfRes.arrayBuffer();
          targetBuffer = Buffer.from(arrayBuffer);
          console.log(`Successfully found and downloaded active calendar: ${url}`);
          break;
        }
      }
    } catch (e) {
      console.error(`Error probing ${url}:`, e);
    }
  }

  // Fallback: If no candidate URLs are reachable (e.g., network offline or changed URL schema),
  // try to fetch the latest from the disposition-sheets.json
  if (!targetBuffer) {
    console.log("No Wednesdays calendar found via probing. Trying fallback to disposition-sheets.json...");
    try {
      const dispoRes = await fetch("https://www.nyc.gov/assets/planning/json/content/commission/disposition-sheets.json", {
        headers: { "User-Agent": "aistudio-build-cpc" }
      });
      if (dispoRes.ok) {
        const data = await dispoRes.json();
        const publicMeetings = data.filter((m: any) => m.type && m.type.toLowerCase().includes("public meeting") && m.dispo);
        if (publicMeetings.length > 0) {
          const latestMeeting = publicMeetings[0];
          const url = latestMeeting.dispo;
          console.log(`Fallback calendar URL from disposition-sheets.json: ${url}`);
          const pdfRes = await fetch(url, { headers: { "User-Agent": "aistudio-build-cpc" } });
          if (pdfRes.ok) {
            targetUrl = url;
            const arrayBuffer = await pdfRes.arrayBuffer();
            targetBuffer = Buffer.from(arrayBuffer);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch fallback from disposition-sheets.json:", err);
    }
  }

  if (!targetBuffer) {
    throw new Error("Could not find or retrieve any active CPC calendar PDF.");
  }

  // Parse PDF
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(targetBuffer) });
  const pdf = await loadingTask.promise;
  let allText = "";
  const extractedProjectIds: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textObj = await page.getTextContent();
    const pageText = textObj.items.map((item: any) => item.str).join(" ");
    allText += pageText + "\n";

    // Extract project IDs from hyperlink annotations
    const annotations = await page.getAnnotations();
    for (const annot of annotations) {
      if (annot.subtype === "Link" && annot.url) {
        const urlStr = annot.url.trim();
        const projectMatch = urlStr.match(/zap\.planning\.nyc\.gov\/projects\/([A-Za-z0-9]+)/i);
        if (projectMatch) {
          extractedProjectIds.push(projectMatch[1].toUpperCase());
        }
      }
    }
  }

  // Find meeting date
  let scheduledDate = "";
  const dateMatch = allText.match(/Scheduling projects for the public meeting of\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  if (dateMatch) {
    scheduledDate = dateMatch[1].trim();
  } else {
    const fallbackMatch = allText.match(/Scheduling projects for\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
    if (fallbackMatch) {
      scheduledDate = fallbackMatch[1].trim();
    } else {
      const coverPageMatch = allText.substring(0, 2000).match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
      if (coverPageMatch) {
        scheduledDate = coverPageMatch[0].trim();
      }
    }
  }

  // Extract project IDs from text as well
  const projectIdRegex = /\b(20\d{2}[A-Z]\d+)\b/gi;
  const matchesProjectIds = allText.match(projectIdRegex) || [];
  for (const pid of matchesProjectIds) {
    extractedProjectIds.push(pid.toUpperCase());
  }
  const projectIds = Array.from(new Set(extractedProjectIds));

  // Extract ULURP numbers from the entire PDF text (not just scheduling section) to capture hearings/reports
  const ulurpRegex = /\b([C|N|M|A|U|X|Y|K|Q|R|Z])\s*(\d{5,6})\s*([A-Z]{2,4})\b/gi;
  const matches = allText.match(ulurpRegex) || [];
  const ulurps = Array.from(new Set(matches.map(m => m.replace(/\s+/g, "").toUpperCase())));

  scheduledProjectsCache = {
    date: scheduledDate || "the next CPC meeting",
    calendarUrl: targetUrl,
    ulurps,
    projectIds,
    lastFetched: now
  };

  return scheduledProjectsCache;
}

// Endpoint 4: Fetch CPC calendar and scheduled project ULURP numbers
app.get("/api/cpc-scheduled-projects", async (req, res) => {
  try {
    const result = await getCPCScheduledProjects();
    res.json({
      scheduledMeetingDate: result.date,
      calendarUrl: result.calendarUrl,
      scheduledUlurps: result.ulurps,
      scheduledProjectIds: result.projectIds
    });
  } catch (error: any) {
    console.error("Error in cpc-scheduled-projects endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to load and parse CPC calendar." });
  }
});

// Configure Vite or Static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}

export default app;
