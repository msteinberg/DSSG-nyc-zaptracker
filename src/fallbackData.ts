export interface SocrataProject {
  project_id: string;
  project_name: string;
  project_brief: string;
  project_status: string;
  public_status: string;
  borough: string;
  ulurp_numbers: string;
  current_milestone: string;
  current_milestone_date: string;
  certified_referred: string;
  applicant_type: string;
}

export const FALLBACK_PROJECTS: SocrataProject[] = [
  {
    "project_id": "2025X0283",
    "project_name": "Fordham Landing South Rezoning",
    "project_brief": "A Zoning Map Amendment from R7-2 to R7-2/C2-4 to facilitate the development of 11,000 square feet of commercial space within Fordham Landing South, an affordable housing development consisting of 982 affordable units, is being sought by DS Fordham Landing 1 LLC at 330 and 360 West Fordham Road in University Heights, Community District 7, The Bronx.",
    "project_status": "Active",
    "public_status": "Noticed",
    "borough": "Bronx",
    "ulurp_numbers": "260173ZMX",
    "current_milestone": "EAS - Project Readiness",
    "current_milestone_date": "2026-02-04T00:00:00.000",
    "certified_referred": "",
    "applicant_type": "Private"
  },
  {
    "project_id": "2025Q0247",
    "project_name": "69-67 108th Street Rezoning",
    "project_brief": "A zoning map amendment from an R1-2A to R7D/C2-4 and zoning text amendment to map MIH to facilitate a new 11-story mixed-use development, with approximately 52,024 sq of residential space (59 dwelling units) and 3,902 sf of commercial space is being sought by 108 ST ., LLC at 69-67 108th Street in Forest Hills, Community District 6, Queens.",
    "project_status": "Active",
    "public_status": "Noticed",
    "borough": "Queens",
    "ulurp_numbers": "260186ZMQ; 260187ZRQ",
    "current_milestone": "ZM - Review Filed Land Use Application",
    "current_milestone_date": "2026-04-21T00:00:00.000",
    "certified_referred": "",
    "applicant_type": "Private"
  },
  {
    "project_id": "2025Q0155",
    "project_name": "158-06 Northern Boulevard Rezoning",
    "project_brief": "A zoning map amendment from R5B/C1-2 and R2 to R7A/C2-4 and R7A zoning district and a zoning text amendment to map MIH to facilitate a new 10-story mixed-use building with 70,765 sf of floor area (5.0 FAR), 76 dwelling units (19 income-restricted units) including 9,282 sf of ground floor commercial use is being sought by Northern 158 Holding LLC at 158-06 Northern Boulevard in Murray Hill, Community District 7, Queens.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Queens",
    "ulurp_numbers": "260171ZMQ; 260172ZRQ",
    "current_milestone": "EAS - Community Board Referral",
    "current_milestone_date": "2026-03-11T00:00:00.000",
    "certified_referred": "2026-03-02T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2025Q0142",
    "project_name": "47-03 108th Street Rezoning",
    "project_brief": "A zoning map amendment from R6B to R7X/C2-4 and zoning text amendment to map MIH to facilitate a new 13-story, 120,000 sf, 119 dwelling unit, mixed-use development, including 90,000 sf of residential space, 8,700 sf of commercial space, and 17,700 sf of community facility space is being sought by 108 Realty Group Inc. at 47-03 108th Street in Corona, Community District 4, Queens.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Queens",
    "ulurp_numbers": "260147ZMQ; N260148ZRQ",
    "current_milestone": "EAS - Borough President Referral",
    "current_milestone_date": "2026-04-14T00:00:00.000",
    "certified_referred": "2026-02-02T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2025K0284",
    "project_name": "FORT HAMILTON MEWS REZONING",
    "project_brief": "A zoning map amendment from R6B/C2-3 (BR) and R5B (BR) to R7X/C2-4 (BR) and a zoning text amendment pursuant to Appendix F to map MIH to facilitate a new 11 story, 292 du mixed use development, including approximately 13,000 sf for commercial and community facility uses, is being sought by 9305 5th Ave LLC in Bay Ridge, CD 10, Brooklyn.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "260238ZMK; 260239ZRK",
    "current_milestone": "EAS - Community Board Referral",
    "current_milestone_date": "2026-03-25T00:00:00.000",
    "certified_referred": "2026-03-16T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2025K0219",
    "project_name": "9201 4th Ave Rezoning",
    "project_brief": "A zoning map amendment from C8-2 (BR) to C4-4D (BR) and zoning text amendment pursuant to Appendix F to facilitate a new eleven story, 129,222 sf, mixed use development, including 18,547 sf of commercial space and 97 dwelling units (with approximately 24 units being permanently income restricted) is being sought by private applicant, 9201 LLC at 9201 4th Avenue in Bay Ridge, CD 10, Brooklyn.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "260048ZMK; 260049ZRK",
    "current_milestone": "EAS - City Council Review",
    "current_milestone_date": "2026-04-11T00:00:00.000",
    "certified_referred": "2025-11-17T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2025K0154",
    "project_name": "1166 Bedford Avenue Rezoning",
    "project_brief": "This is a private application by Khalifah Residences LLC for a Zoning Map Amendment from R6A/C2-4 to R7X/C2-4 and Zoning Text Amendment to designate an MIH area in Appendix F in order to facilitate a new 12-story, 75,602 square foot mixed-use development with 144 units, 13,412 sf of community facility space, and 4,823 sf of commercial, at 1166 Bedford Ave in the Bedford-Stuyvesant neighborhood of Brooklyn, Community District 3.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "260162ZMK; 260163ZRK",
    "current_milestone": "EAS - Borough President Referral",
    "current_milestone_date": "2026-03-31T00:00:00.000",
    "certified_referred": "2026-01-21T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024X0132",
    "project_name": "1160 Pugsley Avenue Rezoning",
    "project_brief": "A zoning map amendment from R5 to R7A/C2-4, zoning text amendment for MIH, and zoning certification for FRESH food store for a new 7-story mixed-use development with 92 units, 32 parking spaces, and mezzanine and cellar containing 97,827 total square feet. The proposed is being sought by a private applicant at 1160-1178 Pugsley Avenue in the Unionport neighborhood of Bronx Community District 9.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Bronx",
    "ulurp_numbers": "250245ZMX; N250246ZRX; N250247ZCX; 260179LDX",
    "current_milestone": "EAS - Borough President Referral",
    "current_milestone_date": "2026-04-01T00:00:00.000",
    "certified_referred": "2026-01-21T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024R0300",
    "project_name": "198-208 Richmond Terrace",
    "project_brief": "A Zoning Map Amendment and Text Amendment, to rezone Block 13, Lots 60, 68, 71, 73, and portion of Lot 8 from R6/C2-2 (SHPD) to R7-3/C2-4 (SSGD), and enable MIH to facilitate a new 14-story residential and community facility building of 97,201 sf, 6.28 FAR, and 117 dwelling units, including 87,088-sf residential, 10,113-sf community-facility, is being sought by Yevgeniy Lvovskiy, Economic Development Opportunity Zone Fund 1, LLC at 198-208 Richmond Terrace, in St. George, CD1, Staten Island.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Staten Island",
    "ulurp_numbers": "260169ZMR; N260170ZRR",
    "current_milestone": "EAS - Review Session - Post Hearing Follow-Up / Future Votes",
    "current_milestone_date": "2026-04-15T00:00:00.000",
    "certified_referred": "2026-02-18T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024Q0325",
    "project_name": "2-28 Beach 87th Street Rezoning",
    "project_brief": "A zoning map amendment from R4-1 to R7A and a zoning text amendment to establish an MIH area to facilitate a new, ten-story residential development, with 58 DUs, including 46,000 sf of residential space, and 3,800 sf of open space, is being sought by Beach 87th Street Associates, LLC at 2-28 Beach 87th Street in Rockaway Beach, Community District 14, Queens.",
    "project_status": "Active",
    "public_status": "Noticed",
    "borough": "Queens",
    "ulurp_numbers": "",
    "current_milestone": "ZM - Prepare Filed Land Use Application",
    "current_milestone_date": "2026-03-27T00:00:00.000",
    "certified_referred": "",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024Q0292",
    "project_name": "108-05 68th Road Rezoning",
    "project_brief": "A zoning map amendment from R1-2A to R7A and a zoning text amendment to facilitate MIH in a new seven-story mixed-use development, including approximately 41,239 sf of residential space (29 DUs) and approximately 11,519 sf of community facility space, is being sought by All My Children Daycare and Nursery School at 108-05 68th Road in Forest Hills, Community District 6, Queens.",
    "project_status": "Active",
    "public_status": "Noticed",
    "borough": "Queens",
    "ulurp_numbers": "260234ZMQ; 260235ZRQ",
    "current_milestone": "EAS - Project Readiness",
    "current_milestone_date": "2026-04-17T00:00:00.000",
    "certified_referred": "",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024Q0219",
    "project_name": "135-27 Sapphire Street Rezoning",
    "project_brief": "A zoning map amendment from R4 to R6A and a zoning text amendment to Appendix F to establish an MIH area to facilitate a new 6-story, 186,380 sf residential development (268 DUs, 67 income-restricted DUs) is being sought by 135 Sapphire LLC, at 135-27 Sapphire Street in Lindenwood, Community District 10, Queens.",
    "project_status": "Active",
    "public_status": "Noticed",
    "borough": "Queens",
    "ulurp_numbers": "250329ZMQ; N250330ZRQ",
    "current_milestone": "EAS - Project Readiness",
    "current_milestone_date": "2026-04-22T00:00:00.000",
    "certified_referred": "",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024Q0164",
    "project_name": "164th Street Rezoning",
    "project_brief": "A zoning map amendment from R3-2 to R6A/C2-4 and a zoning text amendment to Appendix F to map MIH to facilitate a six-story mixed-use development, including residential and community facility space is being sought by 88-66 Myrtle LLC at 75-41 164th Street in Hillcrest, Community District 8, Queens.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Queens",
    "ulurp_numbers": "250290ZMQ; N250291ZRQ",
    "current_milestone": "EAS - Review Session - Pre-Hearing Review / Post Referral",
    "current_milestone_date": "2026-04-14T00:00:00.000",
    "certified_referred": "2026-01-05T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024Q0113",
    "project_name": "50-20 108th Street Rezoning",
    "project_brief": "A zoning map amendment from R6B and R6B/C2-3 to R7A/C2-4 and a zoning text amendment to map MIH to facilitate two new seven-story buildings with a mixed use building approximately 129,619 square feet and a residential building with approximately 11,375 square feet by Federici Buildings Corp. at 50-20 108th Street in South Corona, Community District 4, Queens.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Queens",
    "ulurp_numbers": "250253ZMQ; N250254ZRQ",
    "current_milestone": "EAS - Review Session - Pre-Hearing Review / Post Referral",
    "current_milestone_date": "2026-03-25T00:00:00.000",
    "certified_referred": "2026-01-21T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024M0244",
    "project_name": "Dewitt Clinton Park North (801 Eleventh Avenue)",
    "project_brief": "A private application sought by 801 11th Avenue LLC for a zoning map amendment from M2-3 to C4-7, a zoning text amendment to map Special Hudson River Park District and MIH area, and a special permit pursuant to ZR section 89-21 to facilitate a new 34-story, approximately 386,352-square-foot mixed residential and commercial development at 801 11th Avenue in the Special Clinton District, Community District 4, Manhattan.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Manhattan",
    "ulurp_numbers": "C260015ZSM; C260013ZMM; N260014ZRM; 260201LDM; 260202LDM",
    "current_milestone": "EIS - Review Session - Post Hearing Follow-Up / Future Votes",
    "current_milestone_date": "2026-04-02T00:00:00.000",
    "certified_referred": "2025-12-15T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024K0358",
    "project_name": "Monitor Point",
    "project_brief": "A LSGD, ZM, ZR, a Chair Cert, and a City Map Amendment (see 2025K0287), to facilitate the development of a new 33,000 gsf Museum and educational facility, and two additional new buildings with approximately 877,88 gsf of residential space with approximately 1,150 dwelling units (300 income restricted) approx. 25,700 sf of local retail space, and approx. 37,000 gsf of below grade parking, and approx. 45,000 sf of new open space at 40 Quay Street, CD1, Brooklyn.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "260105ZMK; 260106ZRK; 260107ZSK; 260108ZCK; 260109ZSK; 260110LDK",
    "current_milestone": "EIS - Review Session - Post Hearing Follow-Up / Future Votes",
    "current_milestone_date": "2026-03-19T00:00:00.000",
    "certified_referred": "2025-12-15T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024K0286",
    "project_name": "200 Kent Avenue Rezoning",
    "project_brief": "A zoning map amendment from M1-4 to M1-4A/R7X and zoning text amendment to map MIH (Appendix F) to facilitate the conversion and expansion of an existing non-residential 5-story building to a mixed-use 14-story, approximately 135,840 sf (143 DUs, 36 MIH) development, including116,780 sf of residential floor area and 19,060 sf of commercial floor area, is being sought by 206 Kent LLC and 206 Kent Investor LLC at 200 Kent Avenue in Williamsburg, Community District 1, Brooklyn.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "260149ZMK; 260150ZRK",
    "current_milestone": "EAS - Borough President Referral",
    "current_milestone_date": "2026-04-15T00:00:00.000",
    "certified_referred": "2026-03-02T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024K0280",
    "project_name": "46 Nelson Street Rezoning II",
    "project_brief": "This is an application by 46 Nelson LLC for a zoning map amendment from M1-1 to M1-2A/R7A (MX-5) and M1-1 to M1-2A/R6A (MX-5) along with a zoning text amendment to map MIH (Appendix F) to facilitate the development of a new 125k SF 7-story plus cellar mixed-use residential and commercial building containing 108 dwelling units at 46 Nelson St in Red Hook, Brooklyn, Community District 6.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "250094ZMK; N250095ZRK",
    "current_milestone": "EAS - City Council Review",
    "current_milestone_date": "2026-04-15T00:00:00.000",
    "certified_referred": "2025-11-17T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2024K0196",
    "project_name": "132 Melrose Street Rezoning",
    "project_brief": "An application by Melrose Towers Corp. for a zoning map amendment (M1-1 to R6A/M1-2A (MX-22)) and a zoning text amendment (Appendix F) to facilitate a new 6-story, 24,653 zsf mixed-use development, with 18 DU’s (5 MIH) and 6k sf of ground floor commercial at 132-136 Melrose Street in Bushwick, CD 4.",
    "project_status": "Active",
    "public_status": "In Public Review",
    "borough": "Brooklyn",
    "ulurp_numbers": "260135ZMK; 260136ZRK",
    "current_milestone": "EAS - Community Board Referral",
    "current_milestone_date": "2026-03-25T00:00:00.000",
    "certified_referred": "2026-03-16T00:00:00.000",
    "applicant_type": "Private"
  },
  {
    "project_id": "2023X0149",
    "project_name": "Sojourner Truth - Mapes Rezoning",
    "project_brief": "A zoning map amendment from R7-1 and R7-1/C1-4 to R8 and R8/C2-4 and a zoning text amendment to designate an MIH area (ZR Appendix F) to facilitate two new residential buildings (387,386 total zoning square feet), providing a total of 457 affordable housing units and 8,782 square feet of amenity space, located on Block 3111 (“Mapes Court Redevelopment Site”) and Block 3119 (“Sojourner Truth Redevelopment Site”) in the Crotona neighborhood, Community District 6, the Bronx.",
    "project_status": "Active",
    "public_status": "Noticed",
    "borough": "Bronx",
    "ulurp_numbers": "240206ZMX; N240207ZRX",
    "current_milestone": "EAS - Project Readiness",
    "current_milestone_date": "2026-04-20T00:00:00.000",
    "certified_referred": "",
    "applicant_type": "Private"
  }
];
