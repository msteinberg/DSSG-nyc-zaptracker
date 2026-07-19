export interface DisplacementRiskInfo {
  ntaCode: string;
  ntaName: string;
  displacementRiskIndex: string; // "Lowest" | "Low" | "Intermediate" | "High" | "Highest"
  populationVulnerability: string;
  housingConditions: string;
  marketPressure: string;
  notWhite?: string;
  below2xPovertyRate?: string;
  limitedEnglishProficiency?: string;
  severeRentBurden?: string;
  rentalHousing?: string;
  notIncomeRestricted?: string;
  occupiedRentStabilized?: string;
  threeOrMoreHousingProblems?: string;
  changeInRents?: string;
  salesPriceAppreciation?: string;
  adjacency?: string;
}

export interface Project {
  project_id: string;
  project_name: string;
  project_brief: string;
  project_status: string;       // e.g. "Active", "Completed", "On-Hold"
  public_status: string;        // e.g. "Filed", "In Public Review", "Completed"
  ulurp_non: string;            // e.g. "ULURP", "Non-ULURP"
  actions?: string;
  ulurp_numbers?: string;
  ceqr_type?: string;
  ceqr_number?: string;
  primary_applicant?: string;
  applicant_type?: string;
  borough: string;
  community_district: string;   // e.g. "M08", "K04"
  cc_district?: string;
  current_milestone?: string;
  current_milestone_date?: string;
  certified_referred?: string;
  app_filed_date?: string;
  mih_flag?: string;            // "true" or "false"
  mih_option1?: string;
  mih_option2?: string;
  mih_workforce?: string;
  mih_deepaffordability?: string;
  
  // Geospatial resolved on-demand details
  bbls?: string;
  ntaCode?: string;
  ntaName?: string;
  displacementRisks?: DisplacementRiskInfo[];
  latitude?: string | null;
  longitude?: string | null;
}

export interface TrackedProject extends Project {
  trackedAt: string;
  lastKnownMilestone?: string;
  lastKnownMilestoneDate?: string;
  notes?: string;
  status: "Followed" | "Attending Hearing" | "Testified" | "Reviewed";
}
