import { z } from "zod";

export const exportFormSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  from: z.date({
    required_error: "A start date is required.",
  }),
  to: z.date({
    required_error: "An end date is required.",
  }),
  status: z.string().optional(),
  taskId: z.string().optional(),
  roundId: z.string().optional(),
  unplanned: z.boolean().optional(),
});

export type ExportFormValues = z.infer<typeof exportFormSchema>;

export const roundExportFormSchema = z.object({
  apiKey: z.string().min(1, "La clé d'API est requise."),
  from: z.date({
    required_error: "Une date de début est requise.",
  }),
  to: z.date({
    required_error: "Une date de fin est requise.",
  }),
  status: z.string().optional(),
});

export type RoundExportFormValues = z.infer<typeof roundExportFormSchema>;

export const hubExportFormSchema = z.object({
  apiKey: z.string().min(1, "La clé d'API est requise."),
});

export type HubExportFormValues = z.infer<typeof hubExportFormSchema>;

export const customerExportFormSchema = z.object({
  apiKey: z.string().min(1, "La clé d'API est requise."),
});

export type CustomerExportFormValues = z.infer<typeof customerExportFormSchema>;

export const ticketExportFormSchema = z.object({
  apiKey: z.string().min(1, "La clé d'API est requise."),
});

export type TicketExportFormValues = z.infer<typeof ticketExportFormSchema>;


export const schedulerSchema = z.object({
  estimatedDataSize: z.coerce
    .number()
    .min(0, "Must be a positive number."),
  apiRateLimit: z.coerce.number().int().min(1, "Must be at least 1."),
  serverLoadThreshold: z.coerce
    .number()
    .min(0, "Must be between 0 and 100.")
    .max(100, "Must be between 0 and 100."),
  dataExportFrequency: z.string().min(1, "Frequency is required."),
});

export type SchedulerFormValues = z.infer<typeof schedulerSchema>;
