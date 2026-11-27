import * as z from 'zod';

export const parsedQuestionSchema = z.object({
  text: z.string().min(3, 'Savol matni juda qisqa'),
  options: z
    .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
    .min(2, 'Kamida 2 ta variant kerak')
    .max(6, "Ko'pi bilan 6 ta variant")
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: "Aynan bitta to'g'ri javob belgilanishi kerak",
    }),
});

export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>;
