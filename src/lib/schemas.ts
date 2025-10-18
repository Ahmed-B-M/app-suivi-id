import { z } from "zod";
import { DateRange } from "react-day-picker";

export const unifiedExportFormSchema = z.object({
  apiKey: z.string().min(1, "API Key is required."),
  dateRange: z.custom<DateRange>().refine(
    (data) => !!data?.from,
    { message: "Une date de début est requise." }
  ),
  taskStatus: z.string().optional(),
  roundStatus: z.string().optional(),
  taskId: z.string().optional(),
  roundId: z.string().optional(),
  unplanned: z.boolean().optional(),
});

export type UnifiedExportFormValues = z.infer<typeof unifiedExportFormSchema>;


// Schema for the server action, which will receive dates as strings
export const serverExportSchema = unifiedExportFormSchema.extend({
    from: z.string(),
    to: z.string(),
}).omit({ dateRange: true });


// --- Legacy Schemas (can be removed if no longer used) ---

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
  dateRange: z.custom<DateRange>().refine(
    (data) => !!data?.from,
    { message: "Une date de début est requise." }
  ),
  status: z.string().optional(),
});

export type RoundExportFormValues = z.infer<typeof roundExportFormSchema>;


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
