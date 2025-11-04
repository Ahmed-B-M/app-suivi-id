
'use server';
/**
 * @fileOverview An AI agent that categorizes customer comments and assigns responsibility.
 *
 * - categorizeComment - A function that takes a comment and returns categories and responsibilities.
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
  'Qualité fruits et légumes',
  'Produit lourd sur léger',
  'Produit non alimentaire non protégé',
  'Inversion de produit',
  'Prix',
  'Mauvaise substitution',
  'Promotions non appliquées',
  'Non pertinent',
  'Autre',
] as const;

const responsibilities = ['STEF', 'ID', 'Carrefour', 'Inconnu'] as const;

const CategorizeCommentInputSchema = z.object({
  comment: z.string().describe('The customer comment to categorize.'),
});
export type CategorizeCommentInput = z.infer<typeof CategorizeCommentInputSchema>;

const CategorizeCommentOutputSchema = z.object({
  categories: z.array(z.string()).describe('A list of determined categories for the comment. It can be one or more of the predefined categories, or a new relevant one.'),
  responsibilities: z.array(z.string()).describe('A list of determined responsibilities for the comment. It can be one or more of the predefined responsibilities, or a new relevant one.'),
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
  prompt: `You are an expert customer support analyst for a grocery delivery service.
Your task is to analyze a customer comment, assign it to one or more categories, and determine who is responsible with nuance and careful consideration.

Here is the context of operations:
- We are "ID Logistics" (or "ID"), the delivery company.
- Our client is "Carrefour", the supermarket.
- The orders are prepared by "STEF", a logistics partner.

Based on the comment, you must determine the responsible party (or parties) and the category (or categories) of the issue. You can assign multiple responsibilities and multiple categories if the comment describes several problems.

**Crucially, do not default to blaming the carrier (ID). First, investigate if the root cause could lie with preparation (STEF) or the order itself (Carrefour). Only assign responsibility to "ID" if it is clearly and explicitly a delivery-related failure.**

Here are the rules for assigning responsibility and categories:

1.  **STEF is responsible for (preparation errors):**
    *   Erreur de préparation, Inversion de produit, Produit lourd sur léger, Produit non alimentaire non protégé: These are clearly preparation issues.
    *   Qualité fruits et légumes: The quality of the product itself is a STEF or Carrefour issue.
    *   Manquants multiples, Manquant produit, Manquant bac: This is most likely a preparation error at STEF. Only attribute to "ID" if the comment suggests theft or loss during transit, which is very rare.

2.  **Carrefour is responsible for (store-related issues):**
    *   Prix (complaints about price)
    *   Mauvaise substitution (bad product substitution)
    *   Promotions non appliquées (promotions not applied)

3.  **ID Logistics ("ID") is responsible ONLY FOR EVIDENT delivery errors:**
    *   **Attitude livreur, Amabilité livreur**: Directly related to the driver's behavior.
    *   **Process**: This applies if the driver did not follow standard procedure (not greeting, not asking for code, etc.).
    *   **Casse produit, Rupture chaine de froid**: Can be ID's fault if it happened during transport. However, consider if it could be a preparation issue (STEF) if the comment implies poor packaging. If in doubt, assign shared responsibility or "Inconnu".
    *   **Erreur de livraison**: If the driver delivered to the wrong address.
    *   **Non livré**: Could be ID's fault, but investigate if it could be a STEF issue (never prepared) or a Carrefour issue (order cancelled). If the comment is vague, consider "Inconnu".
    *   **Livraison en retard / en avance**: This is a nuanced issue. Do not automatically blame ID. Could it be a planning issue? A traffic problem? If the comment does not explicitly blame the driver's actions (e.g., "le livreur a pris une longue pause"), consider the responsibility as "Inconnu" or shared.

**Instructions:**
- Analyze the user comment below with a critical eye. Think like an investigator.
- Choose one or more responsibilities from this list: ${responsibilities.join(', ')}.
- Choose one or more categories from this list: ${categories.join(', ')}.
- If the responsibility is not clear, default to "Inconnu".
- If no predefined category or responsibility fits well, you are allowed to create a new, concise, and relevant one.
- If the comment is irrelevant or just positive feedback ("merci", "parfait", "ras", etc.), set the category to "Non pertinent" and responsibility to "Inconnu".

Comment: "{{comment}}"

Format your response as a JSON object that matches the schema CategorizeCommentOutputSchema.
  `,
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
