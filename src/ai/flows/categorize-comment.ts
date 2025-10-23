
'use server';
/**
 * @fileOverview An AI agent that categorizes customer comments.
 *
 * - categorizeComment - A function that takes a comment and returns a category.
 * - CategorizeCommentInput - The input type for the categorizeComment function.
 * - CategorizeCommentOutput - The return type for the categorizeComment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const categories = [
  'Attitude livreur',
  'Amabilité livreur',
  'Casse produit',
  'Manquant produit',
  'Manquant multiple',
  'Manquant bac',
  'Non livré',
  'Erreur de préparation',
  'Erreur de livraison',
  'Livraison en avance',
  'Livraison en retard',
  'Rupture chaine de froid',
  'Process',
  'Non pertinent',
  'Autre',
] as const;

const CategorizeCommentInputSchema = z.object({
  comment: z.string().describe('The customer comment to categorize.'),
});
export type CategorizeCommentInput = z.infer<typeof CategorizeCommentInputSchema>;

const CategorizeCommentOutputSchema = z.object({
  category: z.string().describe('The determined category for the comment. It can be one of the predefined categories or a new relevant one.'),
});
export type CategorizeCommentOutput = z.infer<typeof CategorizeCommentOutputSchema>;

export async function categorizeComment(
  input: CategorizeCommentInput
): Promise<CategorizeCommentOutput> {
  return categorizeCommentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeCommentPrompt',
  input: { schema: CategorizeCommentInputSchema },
  output: { schema: CategorizeCommentOutputSchema },
  prompt: `You are a customer support analyst. Your task is to categorize a customer comment.
  First, try to assign the comment to one of the following predefined categories: ${categories.join(', ')}.
  If none of the predefined categories are a good fit, create a new, concise, and relevant category.
  If the comment is irrelevant, use 'Non pertinent'.

  Comment: "{{comment}}"

  Format your response as a JSON object that matches the schema CategorizeCommentOutputSchema.`,
});

const categorizeCommentFlow = ai.defineFlow(
  {
    name: 'categorizeCommentFlow',
    inputSchema: CategorizeCommentInputSchema,
    outputSchema: CategorizeCommentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
