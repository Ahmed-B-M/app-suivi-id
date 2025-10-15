// OptimizeAPICallSchedule
'use server';

/**
 * @fileOverview An AI agent that determines the optimal schedule for API calls, 
 * considering rate limits and server load.
 *
 * - optimizeApiCallSchedule - A function that returns a schedule for API calls.
 * - OptimizeApiCallScheduleInput - The input type for the optimizeApiCallSchedule function.
 * - OptimizeApiCallScheduleOutput - The return type for the optimizeApiCallSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeApiCallScheduleInputSchema = z.object({
  estimatedDataSize: z
    .number()
    .describe('The estimated size of data to be retrieved in each API call (in MB).'),
  apiRateLimit: z
    .number()
    .describe('The maximum number of API calls allowed per minute.'),
  serverLoadThreshold: z
    .number()
    .describe('The maximum acceptable server load percentage during data retrieval.'),
  dataExportFrequency: z
    .string()
    .describe(
      'How often the data should be exported (e.g., daily, weekly, monthly).'
    ),
});
export type OptimizeApiCallScheduleInput = z.infer<
  typeof OptimizeApiCallScheduleInputSchema
>;

const OptimizeApiCallScheduleOutputSchema = z.object({
  optimalCallInterval: z
    .string()
    .describe(
      'The recommended interval between API calls (e.g., every 10 minutes).' // Added description
    ),
  suggestedExportTime: z
    .string()
    .describe(
      'The suggested time for data export, considering minimal server load (e.g., 03:00 AM).' // Added description
    ),
  notes: z
    .string()
    .describe(
      'Additional notes or recommendations for the data retrieval process.' // Added description
    ),
});
export type OptimizeApiCallScheduleOutput = z.infer<
  typeof OptimizeApiCallScheduleOutputSchema
>;

export async function optimizeApiCallSchedule(
  input: OptimizeApiCallScheduleInput
): Promise<OptimizeApiCallScheduleOutput> {
  return optimizeApiCallScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeApiCallSchedulePrompt',
  input: {schema: OptimizeApiCallScheduleInputSchema},
  output: {schema: OptimizeApiCallScheduleOutputSchema},
  prompt: `You are a data operations expert. You will analyze the data retrieval requirements and suggest an optimal schedule for API calls and data export, considering API rate limits and server load.

  Here are the details:
  - Estimated data size per call: {{estimatedDataSize}} MB
  - API rate limit: {{apiRateLimit}} calls per minute
  - Server load threshold: {{serverLoadThreshold}}%
  - Data export frequency: {{dataExportFrequency}}

  Based on these factors, provide the following:
  1.  Optimal call interval: How often should the API be called to efficiently retrieve data without exceeding rate limits or overloading the server?
  2.  Suggested export time: When is the best time to export the data to minimize server load?
  3.  Notes: Any additional recommendations or considerations for the data retrieval process.

  Format your response as a JSON object that matches the schema OptimizeApiCallScheduleOutputSchema, including a "notes" field explaining your reasoning.
  `,
});

const optimizeApiCallScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeApiCallScheduleFlow',
    inputSchema: OptimizeApiCallScheduleInputSchema,
    outputSchema: OptimizeApiCallScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
