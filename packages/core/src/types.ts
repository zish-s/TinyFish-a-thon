/**
 * Shared domain types for ReclaimYourNet.
 *
 * The product is a "report once, file everywhere" pipeline:
 *   free-text incident  ->  explainable triage (ML)  ->  live channel discovery
 *   (TinyFish)  ->  live form archaeology (TinyFish agent)  ->  human review
 *   ->  agent files the report  ->  tamper-evident evidence  ->  follow-up monitoring.
 */

export type IncidentLabel =
  | 'impersonation'
  | 'financial_fraud'
  | 'image_misuse'
  | 'harassment'
  | 'hate_speech'
  | 'stalking'
  | 'doxxing'
  | 'misinformation'
  | 'defamation'
  | 'child_safety'
  | 'account_takeover'
  | 'sextortion'
  | 'counterfeit'
  | 'romance_scam';

export type Urgency = 'critical' | 'high' | 'normal';

export type ChannelKind =
  | 'platform'
  | 'authority'
  | 'financial'
  | 'escalation'
  | 'support'
  | 'protection';

export type ChannelStatus =
  | 'planned' // discovered / seeded, not yet touched
  | 'analysed' // form spec extracted from the live page
  | 'ready' // draft is pre-filled, waiting for user approval
  | 'submitted' // agent filed it
  | 'skipped' // user declined
  | 'failed' // agent could not complete it
  | 'manual'; // user has to do it themselves (needs login / physical step)

export interface TokenContribution {
  token: string;
  /** Signed log-odds contribution. Positive = pushes the label up. */
  weight: number;
}

export interface LabelScore {
  label: IncidentLabel;
  /** Independent posterior for this label (sigmoid of the Bernoulli NB logit). */
  probability: number;
  /** Log-odds score (for sorting / debugging). */
  score: number;
  /** Tokens that drove this label, strongest first. */
  contributions: TokenContribution[];
}

export type EntityType =
  | 'amount'
  | 'platform'
  | 'url'
  | 'phone'
  | 'email'
  | 'upi'
  | 'handle'
  | 'date'
  | 'location'
  | 'address'
  | 'identity'
  | 'account_number';

export interface ExtractedEntity {
  type: EntityType;
  /** Normalised value. */
  value: string;
  /** The original substring as written by the user. */
  raw: string;
}

export interface Redaction {
  type: EntityType;
  placeholder: string;
  /** Masked preview, e.g. "+91 98****  *21". */
  preview: string;
}

export interface TriageResult {
  raw: string;
  /** Text with sensitive values swapped for placeholders. */
  redactedText: string;
  redactions: Redaction[];
  labels: LabelScore[];
  /** Labels the model considers active for this incident. */
  activeLabels: IncidentLabel[];
  /** Primary incident type. */
  primaryLabel: IncidentLabel;
  entities: ExtractedEntity[];
  urgency: Urgency;
  urgencyReasons: string[];
  /** True when no label crossed the confidence floor -> route to a human/LLM. */
  needsReview: boolean;
  /** Signals that escalate outside the normal channel set. */
  hardSignals: string[];
}

export interface ChannelField {
  name: string;
  label: string;
  required: boolean;
  kind: 'text' | 'textarea' | 'select' | 'date' | 'email' | 'tel' | 'file' | 'radio' | 'unknown';
  options?: string[];
}

export interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  jurisdiction: string;
  url: string;
  /** Why this channel applies to THIS incident. */
  why: string;
  /** Which triage labels triggered it. */
  triggeredBy: IncidentLabel[];
  requiredFields: ChannelField[];
  requiredEvidence: string[];
  /** Hours until this channel becomes materially less effective. */
  slaHours: number | null;
  slaNote: string;
  status: ChannelStatus;
  /** 'discovered' = found live via TinyFish Search, 'seed' = static fallback. */
  source: 'discovered' | 'seed';
  /** Human-readable trust score for the domain (0..1). */
  trust: number;
  /** 'now' = act on this first, 'later' = worth doing once the urgent ones are done. */
  priority: 'now' | 'later';
  /** Overrides the search query used to find this channel's live page. */
  discoveryQuery?: string;
  /** The state or region this channel has jurisdiction over. */
  region?: string;
  /** Other live results found while discovering this channel. */
  alternates?: { title: string; url: string }[];
  /** Draft values keyed by field name, ready for review. */
  draft: Record<string, string>;
  /** Values the person typed themselves - kept when the draft is rebuilt. */
  overrides?: Record<string, string>;
  /** Free-text narrative built from the incident. */
  narrative?: string;
  /** Reference / ticket number returned after filing. */
  reference?: string;
  error?: string;
}

export interface CoverageGap {
  id: string;
  title: string;
  detail: string;
  severity: 'blocker' | 'important' | 'advisory';
  /** What the user should do about it. */
  action: string;
}

export interface CoveragePlan {
  channels: Channel[];
  gaps: CoverageGap[];
  estimatedMinutes: number;
  jurisdiction: string;
}

export interface EvidenceItem {
  id: string;
  label: string;
  kind: 'page_snapshot' | 'screenshot' | 'extraction' | 'reference' | 'note';
  url?: string;
  content?: string;
  capturedAt: string;
  /** SHA-256 of the content, chained to the previous item. */
  hash: string;
  prevHash: string;
}

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface AgentStep {
  id: string;
  channelId: string;
  channelName: string;
  /** Human sentence shown in the timeline, e.g. "Opening the complaint form". */
  purpose: string;
  status: AgentStepStatus;
  startedAt?: string;
  finishedAt?: string;
  /** Live view of the agent's browser while it runs. */
  streamingUrl?: string;
  result?: unknown;
  error?: string;
}

export interface ReporterProfile {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export interface CaseFile {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  incident: TriageResult;
  plan: CoveragePlan;
  evidence: EvidenceItem[];
  status: 'triaged' | 'planning' | 'ready' | 'filing' | 'filed' | 'monitoring' | 'closed';
  country: string;
  /** The details the reporter gave us, kept so drafts can be rebuilt. */
  profile: ReporterProfile;
  /** True when the agents should drive the bundled demo portals. */
  sandbox?: boolean;
}

export interface MonitorBinding {
  id: string;
  channelId: string;
  channelName: string;
  type: 'page' | 'topic';
  target: string;
  purpose: string;
  status: string;
  lastOutcome?: string;
  createdAt: string;
}
