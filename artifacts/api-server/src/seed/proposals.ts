import { db } from "@workspace/db";
import { proposalsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";

const US_15_POINT_PLAN = {
  id: "us-15-point-plan",
  name: "US 15-Point Iran Deal Framework",
  source: "US State Department / Trump Administration 2025",
  submittedBy: "human",
  summary: "A maximalist US framework demanding comprehensive Iranian nuclear rollback, cessation of proxy support, and verifiable behavioral change in exchange for sanctions relief.",
  terms: {
    nuclearProtocol: "Complete halt to 60% and 20% enrichment. Elimination of stockpile above 3.67%. Decommissioning of advanced centrifuges (IR-6, IR-8). Permanent ban on enrichment above 5%. IAEA access to all military sites, not just declared facilities.",
    sanctionsRelief: "Phased primary and secondary sanctions relief tied to verified nuclear rollback milestones. No upfront sanctions relief. Oil exports restored only after 12-month compliance verification. Snap-back mechanism with automatic re-imposition.",
    hormuzArrangements: "Iran renounces right to close Hormuz. Joint maritime monitoring with Gulf states and US Navy. No anti-access/area-denial deployments.",
    humanitarianProvisions: "Humanitarian exemptions for medicine and food remain, but frozen assets ($7B) released only after 6-month compliance verification.",
    verificationMechanism: "IAEA Additional Protocol with modified Code 3.1. US national intelligence monitoring. Snap inspections within 24 hours. Access to key military sites including Parchin.",
    timelineYears: 15,
    sequencing: "Iran takes all nuclear steps first. US lifts oil sanctions after 12-month verified compliance. Full sanctions normalization after 15 years.",
    additionalClauses: [
      "Iran must cease support for Houthis, Hezbollah, Hamas, and PMF",
      "Iran must cease ballistic missile development above 300km range",
      "No nuclear cooperation with Russia or China without US consent",
      "Regional security architecture consultation with GCC and Israel",
      "Annual review mechanism with US Congress",
    ],
  },
  knownResponses: {
    iran: "Flatly rejected as 'humiliating' and 'regime-change agenda.' Supreme Leader declared enrichment a red line.",
    russia: "Opposed as unilateral and maximalist. Supports Iranian right to civilian nuclear program.",
    china: "Criticized as 'unreasonable demands' that cannot be basis for negotiation.",
    eu3: "Concerned about excessive demands but supports strong verification. Seeking middle ground.",
    israel: "Strongly supports nuclear provisions but skeptical about ballistic missiles clause enforcement.",
    iaea: "Supports verification mechanisms. Concerned about access to military sites creating political obstacles.",
  },
  scores: {
    feasibility: 0.15,
    coherence: 0.70,
    evidenceGrounding: 0.65,
    domesticSellability: 0.25,
    regionalStability: 0.45,
    implementability: 0.20,
    durability: 0.30,
    composite: 0.30,
  },
};

const IRAN_5_POINT_PLAN = {
  id: "iran-5-point-counterproposal",
  name: "Iran 5-Point Counterproposal",
  source: "Iranian Foreign Ministry / Araghchi 2025",
  submittedBy: "human",
  summary: "Iran's reciprocal framework insisting on immediate sanctions lifting, recognition of enrichment rights, and mutual non-aggression guarantees as preconditions.",
  terms: {
    nuclearProtocol: "Iran maintains right to enrich uranium for civilian purposes under NPT. Caps enrichment at 20% (not lower than JCPOA 3.67% if US wants, but mutual). No elimination of advanced centrifuges — only suspension. IAEA monitoring continues under Additional Protocol.",
    sanctionsRelief: "ALL sanctions lifted immediately and comprehensively before any nuclear steps. Assets unfrozen in advance of talks. This is Iran's non-negotiable pre-condition.",
    hormuzArrangements: "Hormuz is Iranian sovereign interest. Freedom of navigation guaranteed by Iran voluntarily but not subject to international oversight. No foreign military presence in Persian Gulf.",
    humanitarianProvisions: "Immediate unfreezing of all Iranian assets globally ($100B+). Full humanitarian imports with no restrictions. Banking access restored immediately.",
    verificationMechanism: "IAEA standard protocols. No access to military sites. No intelligence-sharing requirements. All monitoring under IAEA Board of Governors only.",
    timelineYears: 2,
    sequencing: "US lifts all sanctions first. Iran then discusses nuclear limitations on mutual basis. All steps reciprocal and simultaneous.",
    additionalClauses: [
      "US provides written guarantee of no regime change, military action, or covert operations",
      "US recognizes Iranian right to civilian nuclear program under NPT",
      "Regional matters (Hezbollah, Houthis) are separate track — not part of nuclear deal",
      "Ballistic missiles are defensive — not subject to negotiation",
    ],
  },
  knownResponses: {
    us: "Non-starter. No administration can lift sanctions before compliance. Congress would block.",
    israel: "Completely unacceptable. Leaves enrichment infrastructure intact.",
    eu3: "Supportive of phased approach but sanctions-first is politically impossible for US.",
    saudi_arabia: "Skeptical. Regional provisions inadequate. Needs Houthi and Hezbollah addressed.",
    russia: "Supportive of Iranian position on sanctions-first and sovereignty.",
    china: "Supports Iranian framework as starting point for negotiations.",
    iaea: "Supports Additional Protocol. Concerned about exclusion from military sites.",
  },
  scores: {
    feasibility: 0.20,
    coherence: 0.65,
    evidenceGrounding: 0.60,
    domesticSellability: 0.22,
    regionalStability: 0.35,
    implementability: 0.18,
    durability: 0.28,
    composite: 0.28,
  },
};

export async function seedProposals(): Promise<void> {
  const existing = await db.select({ id: proposalsTable.id }).from(proposalsTable);
  const existingIds = new Set(existing.map(e => e.id));

  const proposals = [US_15_POINT_PLAN, IRAN_5_POINT_PLAN];

  for (const proposal of proposals) {
    if (existingIds.has(proposal.id)) {
      logger.debug({ id: proposal.id }, "Proposal already exists, skipping");
      continue;
    }

    await db.insert(proposalsTable).values({
      id: proposal.id,
      name: proposal.name,
      source: proposal.source,
      submittedBy: proposal.submittedBy,
      summary: proposal.summary,
      terms: proposal.terms,
      scores: proposal.scores,
      stakeholderEvaluations: Object.fromEntries(
        Object.entries(proposal.knownResponses).map(([stakeholder, rationale]) => [
          stakeholder,
          {
            verdict: "conditional" as const,
            rationale,
            redLineViolations: [],
            conditions: [],
          },
        ])
      ),
      knownResponses: proposal.knownResponses,
      whatWouldItTake: [],
    });

    logger.info({ id: proposal.id }, "Seeded real-world proposal");
  }
}
