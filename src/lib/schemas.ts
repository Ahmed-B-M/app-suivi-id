import { z } from "zod";

export const exportFormSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  from: z.date({
    required_error: "A start date is required.",
  }),
  to: z.date({
    required_error: "An end date is required.",
  }),
  hubs: z.string().optional(),
});

export type ExportFormValues = z.infer<typeof exportFormSchema>;

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
