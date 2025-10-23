
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
Your task is to analyze a customer comment, assign it to one or more categories, and determine who is responsible.

Here is the context of operations:
- We are "ID Logistics" (or "ID"), the delivery company.
- Our client is "Carrefour", the supermarket.
- The orders are prepared by "STEF", a logistics partner.

Based on the comment, you must determine the responsible party (or parties) and the category (or categories) of the issue. You can assign multiple responsibilities and multiple categories if the comment describes several problems.

Here are the rules for assigning responsibility and categories:

1.  **STEF is responsible for (preparation errors):**
    *   Erreur de préparation
    *   Produit lourd sur léger
    *   Produit non alimentaire non protégé
    *   Inversion de produit
    *   Qualité fruits et légumes
    *   Manquants multiples

2.  **ID Logistics ("ID") is responsible for (delivery errors):**
    *   Erreur de livraison
    *   Casse produit
    *   Rupture chaine de froid
    *   Livraison en retard (if not specified as planned)
    *   Livraison en avance (if not specified as planned)
    *   Non livré
    *   **Process**: This category applies if the delivery driver did not follow the standard procedure, which includes:
        - Greeting the customer ("bonjour").
        - Asking for the security code.
        - Delivering up to the 6th floor without an elevator.
        - Collecting empty bags.
        If the comment mentions a failure in any of these steps, assign the "Process" category and "ID" responsibility.

3.  **Carrefour is responsible for (store-related issues):**
    *   Prix (complaints about price)
    *   Mauvaise substitution (bad product substitution)
    *   Promotions non appliquées (promotions not applied)

**Instructions:**
- Analyze the user comment below.
- Choose one or more responsibilities from this list: ${responsibilities.join(', ')}.
- Choose one or more categories from this list: ${categories.join(', ')}.
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
