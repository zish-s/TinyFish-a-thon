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
  /** What the agent managed to fill, so the user can see it without watching. */
  fillResult?: {
    filled: number;
    total: number;
    /** Labels of the fields the form requires and nobody could supply. */
    missing: string[];
    note?: string;
  };
  /** Reference / ticket number returned after filing. */
  reference?: string;
  /** When the complaint was actually filed on this channel. */
  filedAt?: string;
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
  kind: 'page_snapshot' | 'screenshot' | 'extraction' | 'reference' | 'note' | 'upload';
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
  state?: string;
  /** e.g. "Aadhaar", "PAN", "Driving licence". */
  idType?: string;
  /** The number on that document. */
  idNumber?: string;
}

/**
 * The person, or the account, the complaint is against.
 *
 * This is the part a police station actually asks for: the handle, the
 * platform it sits on, the link, and anything else that identifies it.
 */
export interface SuspectDetails {
  /** Usernames of the account(s) used, e.g. "rahul.finance.2024". */
  handles?: string[];
  /** The platform the account is on, e.g. "Instagram". */
  platform?: string;
  /** Profile or post links. */
  urls?: string[];
  /** Phone, email, UPI id, account number - anything else that identifies them. */
  identifiers?: string;
  /** Anything known about the person: age, gender, city, how they were seen. */
  description?: string;
}

/**
 * The particulars of the incident, as the reporter stated them.
 *
 * This is deliberately separate from the machine's own reading of the story:
 * a police file needs what the person said, when and where it happened, and
 * who was responsible - not a classifier's opinion.
 */
export interface IncidentDetails {
  /** Date the incident happened (YYYY-MM-DD). */
  date?: string;
  /** Time the incident happened (HH:MM). */
  time?: string;
  /** Where it happened: an address, an area, or "online". */
  place?: string;
  /** How it happened. */
  mode?: 'online' | 'offline' | 'both';
  /** True when it is still going on. */
  ongoing?: boolean;
  /** Money involved, if any. */
  amount?: string;
  /** How many times, or how long it has been going on. */
  frequency?: string;
  /** The complainant's own account of what happened. */
  description?: string;
  /** The person or account responsible. */
  suspect?: SuspectDetails;
  /** Anything else the reporter wants on record. */
  additional?: string;
}

/**
 * A file the reporter supplied with the case: a screenshot, a video, a
 * payment receipt, an exported chat. The bytes are hashed so the file that
 * goes to a police station can be proven to be the file that was given here.
 */
export interface UploadedEvidence {
  id: string;
  /** The file name as it was on the reporter's device. */
  name: string;
  /** The type the file actually is, decided from its bytes. */
  type: string;
  /** The type the sender claimed, when it did not match the bytes. */
  declaredType?: string;
  /** Size in bytes. */
  size: number;
  /** SHA-256 of the file bytes. */
  hash: string;
  /** What the reporter says this evidence shows. */
  description: string;
  /** When the reporter says it was captured. */
  capturedAt?: string;
  /** When it was uploaded. */
  uploadedAt: string;
  /** Where the bytes can be fetched from. */
  url?: string;
  /** Withdrawn by the reporter. Kept in the chain, left out of the annexures. */
  withdrawn?: boolean;
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
  /** What the reporter told us about when, where, who and how much. */
  details?: IncidentDetails;
  /** Files the reporter attached to the case themselves. */
  uploads?: UploadedEvidence[];
  /**
   * The monitors we armed for this case. They travel with the case file so
   * the case-file PDF and the follow-up panel still know about them on a
   * serverless platform, where the next request may land on another instance.
   */
  monitors?: MonitorBinding[];
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
