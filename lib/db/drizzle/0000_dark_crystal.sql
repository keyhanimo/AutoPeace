CREATE TABLE "stakeholders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"region" text NOT NULL,
	"flag" text DEFAULT '' NOT NULL,
	"goals" text DEFAULT '' NOT NULL,
	"red_lines" text DEFAULT '' NOT NULL,
	"preferred_outcomes" text DEFAULT '' NOT NULL,
	"constraints" text DEFAULT '' NOT NULL,
	"communication_style" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"tokens_consumed" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"experiments_run" integer DEFAULT 0 NOT NULL,
	"experiments_retained" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"experiment_id" text,
	"evidence_pack_version" text DEFAULT '' NOT NULL,
	"time_horizon" text NOT NULL,
	"probabilities" jsonb NOT NULL,
	"rationale" text DEFAULT '' NOT NULL,
	"key_evidence_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brier_score" real,
	"log_score" real,
	"calibration_bucket" text,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"task" text DEFAULT 'A' NOT NULL,
	"change_description" text NOT NULL,
	"change_diff" text DEFAULT '' NOT NULL,
	"scores_before" jsonb,
	"scores_after" jsonb,
	"diagnosis" text,
	"retained" boolean DEFAULT false NOT NULL,
	"tokens_consumed" integer DEFAULT 0 NOT NULL,
	"wall_clock_seconds" integer,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"provider_costs" jsonb
);
--> statement-breakpoint
CREATE TABLE "evidence_items" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"published_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"evidence_type" text DEFAULT 'general' NOT NULL,
	"stakeholder_relevance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"influenced_cycle_id" text,
	"influenced_forecast_id" text
);
--> statement-breakpoint
CREATE TABLE "cost_of_war" (
	"id" text PRIMARY KEY NOT NULL,
	"stakeholder_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"economic" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"humanitarian" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"strategic" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_version" text DEFAULT '1.0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"headline" text NOT NULL,
	"forecast_delta" jsonb,
	"score_delta" jsonb,
	"key_evidence" jsonb,
	"experiments_tried" integer DEFAULT 0 NOT NULL,
	"experiments_retained" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "admin_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "evidence_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp,
	"fetch_frequency_minutes" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"parent_id" text,
	"architecture" text DEFAULT 'balanced' NOT NULL,
	"terms" jsonb NOT NULL,
	"scores" jsonb,
	"stakeholder_evaluations" jsonb,
	"domestic_evaluations" jsonb,
	"domestic_framing_strategies" jsonb,
	"brainstorm_insights" jsonb,
	"red_team_results" jsonb,
	"negotiator_result" jsonb,
	"meta_evaluator_result" jsonb,
	"pipeline_config" jsonb,
	"diagnosis" text,
	"is_pareto" boolean DEFAULT false NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"generated_by" text DEFAULT 'ai' NOT NULL,
	"tokens_consumed" integer DEFAULT 0 NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_evolution" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_config_id" text,
	"generation" integer DEFAULT 0 NOT NULL,
	"prompt_overrides" jsonb NOT NULL,
	"parameter_overrides" jsonb NOT NULL,
	"description" text NOT NULL,
	"avg_composite_score" real,
	"deal_count" integer DEFAULT 0 NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"submitted_by" text DEFAULT 'human' NOT NULL,
	"terms" jsonb NOT NULL,
	"scores" jsonb,
	"stakeholder_evaluations" jsonb,
	"known_responses" jsonb,
	"what_would_it_take" jsonb,
	"summary" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_tree" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"parent_node_id" text,
	"cycle_id" text NOT NULL,
	"branch_label" text DEFAULT 'main' NOT NULL,
	"architecture" text DEFAULT 'balanced' NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"is_stalled" boolean DEFAULT false NOT NULL,
	"stalled_reason" text,
	"is_best_in_branch" boolean DEFAULT false NOT NULL,
	"composite_score" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_forecasts" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"time_horizon" text NOT NULL,
	"estimates" jsonb NOT NULL,
	"ip_address" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"submitter_name" text DEFAULT 'Anonymous' NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text NOT NULL,
	"summary" text NOT NULL,
	"terms" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"reviewed_at" timestamp,
	"approved_proposal_id" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "what_if_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"trigger_condition" text NOT NULL,
	"based_on_cycle_id" text,
	"probability_deltas" jsonb NOT NULL,
	"absolute_probabilities" jsonb NOT NULL,
	"proposal_impacts" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"unsubscribed_at" timestamp,
	"source" text DEFAULT 'web' NOT NULL,
	CONSTRAINT "email_subscriptions_email_unique" UNIQUE("email")
);
