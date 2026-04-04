import { db } from "@workspace/db";
import { proposalsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  evaluateStakeholders,
  judgeAndScore,
  computeWhatWouldItTake,
} from "../services/deal-engine";
import { getModelConfig } from "../services/llm-router";

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

const ZARIF_FOREIGN_AFFAIRS_PLAN = {
  id: "zarif-foreign-affairs-2026",
  name: "Zarif Foreign Affairs Peace Plan",
  source: "Javad Zarif / Foreign Affairs, April 2026",
  submittedBy: "human",
  summary: "Former Iranian FM Zarif proposes a comprehensive peace framework published in Foreign Affairs: cap enrichment at 3.67%, ratify IAEA Additional Protocol, transfer enriched materials to a regional consortium with China and Russia, reopen the Strait of Hormuz, sign a US-Iran nonaggression pact, and lift all sanctions with full economic reintegration.",
  terms: {
    nuclearProtocol: "Iran commits to never pursuing nuclear weapons. Caps uranium enrichment at 3.67% (2015 JCPOA level). Ratifies and fully implements the IAEA Additional Protocol for enhanced inspections. Transfers all enriched uranium stockpiles and centrifuge equipment to a regional enrichment consortium involving China and Russia.",
    sanctionsRelief: "All US and allied sanctions lifted comprehensively. Iran allowed full reintegration into the global economy. Oil companies, including American firms, invited to facilitate Iranian exports. US commits to financing reconstruction of war damages from 2025-2026 military campaigns, including civilian compensation.",
    hormuzArrangements: "Iran reopens the Strait of Hormuz fully while retaining sovereign access to the waterway. Normal commercial shipping restored.",
    humanitarianProvisions: "US commits to financing reconstruction of damages caused by the 2025-2026 wars in Iran, including compensating civilians for their losses. Full humanitarian access restored.",
    verificationMechanism: "Full IAEA Additional Protocol ratified permanently. Enhanced monitoring of all nuclear facilities. Regional enrichment consortium provides multilateral oversight of enrichment activities.",
    timelineYears: 5,
    sequencing: "Simultaneous steps: Iran caps enrichment and begins material transfers while US lifts sanctions. Nonaggression pact signed as framework agreement. Regional consortium established within first year. Diplomatic relations explored via interest sections and consular services.",
    additionalClauses: [
      "Permanent mutual nonaggression pact between Iran and the United States",
      "Regional uranium enrichment consortium involving Iran, China, and Russia",
      "Exploration of diplomatic normalization: interest sections, consular services, travel restrictions removed",
      "Energy and advanced technology partnerships between Iran, US, and Gulf states",
      "Iran declares victory and uses strong position to negotiate comprehensive settlement",
    ],
    stakeholderCommitments: {
      iran: "Caps enrichment at 3.67%, ratifies Additional Protocol, transfers enriched materials to regional consortium, reopens Hormuz",
      us: "Lifts all sanctions, signs nonaggression pact, finances reconstruction of war damages, commits to no regime change",
      china: "Participates in regional enrichment consortium",
      russia: "Participates in regional enrichment consortium",
    },
  },
  knownResponses: {
    us: "Trump has maintained Iran must have zero enrichment, making the 3.67% cap potentially insufficient. However, rising energy costs from bombardment create political pressure for an off-ramp.",
    israel: "Likely opposes leaving enrichment infrastructure partially intact. Concerned about regional consortium legitimizing Iranian nuclear capabilities.",
    saudi_arabia: "Gulf states view bilateral US-Iran pact as inadequate — leaves Iran's relationship with neighbors undefined. Missile and drone constraints not addressed. Gulf states absorbed economic damage from disrupted shipping and want reconstruction costs shared.",
    eu3: "May support as practical middle ground. Verification provisions stronger than JCPOA. Concerned about lack of ballistic missile provisions.",
    russia: "Supportive of consortium concept and Iranian sovereignty framework. Benefits from role in regional enrichment facility.",
    china: "Supportive as Iran's top trade partner. Benefits from consortium role and restored economic access.",
    iaea: "Welcomes Additional Protocol ratification and enhanced monitoring. Consortium model provides additional oversight layer.",
  },
  scores: {
    feasibility: 0.35,
    coherence: 0.72,
    evidenceGrounding: 0.75,
    domesticSellability: 0.30,
    regionalStability: 0.40,
    implementability: 0.32,
    durability: 0.45,
    composite: 0.42,
  },
};

const CHINA_PAKISTAN_5_POINT_INITIATIVE = {
  id: "china-pakistan-5-point-initiative",
  name: "China-Pakistan Five-Point Peace Initiative",
  source: "China & Pakistan Foreign Ministers (Wang Yi & Ishaq Dar) / March 31, 2026",
  submittedBy: "human",
  summary: "A joint five-point initiative by China and Pakistan calling for immediate cessation of hostilities, start of peace talks, protection of civilians and infrastructure, security of Strait of Hormuz shipping lanes, and primacy of the UN Charter for a comprehensive peace framework.",
  terms: {
    nuclearProtocol: "Parties must stop attacking peaceful nuclear infrastructure such as nuclear power plants. Nuclear issues to be resolved through comprehensive peace framework under UN auspices.",
    sanctionsRelief: "Not explicitly addressed in the five points. Implied through call for comprehensive peace framework and full diplomatic resolution.",
    hormuzArrangements: "The Strait of Hormuz and adjacent waters are recognized as an important global shipping route for goods and energy. Parties called on to protect the security of ships and crew members stranded in the strait and restore normal passage as soon as possible.",
    humanitarianProvisions: "Humanitarian assistance must be allowed to all war-affected areas. Parties must immediately stop attacks on civilians and nonmilitary targets, fully adhere to International Humanitarian Law, and stop attacking important infrastructure including energy, desalination, and power facilities.",
    verificationMechanism: "Support for true multilateralism and primacy of the UN. Comprehensive peace framework to be concluded under UN auspices with international monitoring.",
    timelineYears: 2,
    sequencing: "Step 1: Immediate cessation of hostilities. Step 2: Humanitarian assistance to war-affected areas. Step 3: Start of peace talks with all parties committed to peaceful resolution and refraining from use or threat of force. Step 4: Comprehensive peace framework under UN auspices.",
    additionalClauses: [
      "Dialogue and diplomacy are the only viable option to resolve conflicts",
      "All parties must refrain from the use or threat of force during peace talks",
      "Parties must stop attacking energy, desalination, and power facilities",
      "Joint call to practice true multilateralism and strengthen the primacy of the UN",
      "Pakistan emerged as unlikely peace partner after chairing meeting with Turkey, Saudi Arabia, and Egypt foreign ministers",
    ],
    stakeholderCommitments: {
      china: "Co-sponsor of initiative, calls for multilateral peace framework under UN",
      pakistan: "Co-sponsor, chairs broader diplomatic coalition including Turkey, Saudi Arabia, and Egypt",
    },
  },
  knownResponses: {
    us: "Has not formally responded. Framework notably does not require preconditions from any party, which may conflict with US demands.",
    iran: "Likely receptive — framework does not demand nuclear concessions as precondition and calls for cessation of hostilities first.",
    israel: "Skeptical of frameworks that don't address Iranian nuclear program and proxy networks as preconditions.",
    saudi_arabia: "Participated in broader diplomatic meeting chaired by Pakistan. Supportive of ceasefire and humanitarian provisions.",
    russia: "Supportive of UN-centered multilateral approach. Aligns with Russian advocacy for multipolarity.",
    eu3: "Likely supportive of ceasefire-first approach but may want stronger nuclear provisions in comprehensive framework.",
  },
  scores: {
    feasibility: 0.45,
    coherence: 0.55,
    evidenceGrounding: 0.70,
    domesticSellability: 0.40,
    regionalStability: 0.50,
    implementability: 0.42,
    durability: 0.35,
    composite: 0.44,
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

  const proposals = [US_15_POINT_PLAN, IRAN_5_POINT_PLAN, ZARIF_FOREIGN_AFFAIRS_PLAN, CHINA_PAKISTAN_5_POINT_INITIATIVE];
  const modelConfig = await getModelConfig();

  for (const proposal of proposals) {
    if (existingIds.has(proposal.id)) {
      logger.debug({ id: proposal.id }, "Proposal already exists, skipping");
      continue;
    }

    const initialEvals = Object.fromEntries(
      Object.entries(proposal.knownResponses).map(([stakeholder, rationale]) => [
        stakeholder,
        { verdict: "conditional" as const, rationale, redLineViolations: [], conditions: [] },
      ])
    );

    await db.insert(proposalsTable).values({
      id: proposal.id,
      name: proposal.name,
      source: proposal.source,
      submittedBy: proposal.submittedBy,
      summary: proposal.summary,
      terms: proposal.terms,
      scores: proposal.scores,
      stakeholderEvaluations: initialEvals,
      knownResponses: proposal.knownResponses,
      whatWouldItTake: [],
    });

    logger.info({ id: proposal.id }, "Seeded real-world proposal — running AI evaluation");

    try {
      const terms = proposal.terms;
      const { evaluations: aiEvals } = await evaluateStakeholders(terms, modelConfig);
      const [{ scores: aiScores }, rawWwit] = await Promise.all([
        judgeAndScore(terms, aiEvals, [], {}, modelConfig),
        computeWhatWouldItTake(terms, aiEvals, modelConfig),
      ]);

      const whatWouldItTake = rawWwit.map(item => ({
        dimension: item.stakeholder,
        currentGap: "Stakeholder rejects or conditionally accepts current terms",
        requiredChange: item.requirement,
        feasibility: item.feasibility,
      }));

      await db.update(proposalsTable)
        .set({
          stakeholderEvaluations: aiEvals,
          scores: aiScores,
          whatWouldItTake,
        })
        .where(eq(proposalsTable.id, proposal.id));

      logger.info({ id: proposal.id }, "AI evaluation complete for seeded proposal");
    } catch (err) {
      logger.warn({ id: proposal.id, err }, "AI evaluation failed for seeded proposal — keeping static scores");
    }
  }
}
