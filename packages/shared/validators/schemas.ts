import { z } from 'zod';

export const PigeonSchema = z.object({
  matricule    : z.string().min(3, 'Matricule requis (min. 3 caractères)'),
  nom          : z.string().min(1, 'Nom requis'),
  sexe         : z.enum(['MALE', 'FEMALE'], { message: 'Sexe requis' }),
  race         : z.string().min(1, 'Race requise'),
  dateNaissance: z.string().min(1, 'Date de naissance requise'),
  couleur      : z.string().min(1, 'Couleur requise'),
  pereId       : z.string().nullable().optional(),
  mereId       : z.string().nullable().optional(),
  notes        : z.string().optional().default(''),
  photo        : z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : v),
    z
      .union([
        z.string().url('Indique une URL valide (https://…) ou laisse vide si la photo vient uniquement du fichier local (localStorage).'),
        z.null(),
      ])
      .optional(),
  ),
});

export const CageSchema = z.object({
  numero      : z.string().min(1, 'Numéro requis'),
  nom         : z.string().min(1, 'Nom requis'),
  superficie  : z.number({ error: 'Superficie requise' }).min(0.1, 'Superficie > 0'),
  description : z.string().optional().default(''),
  voliereCode : z.string().min(1).optional().default('A'),
});

export const CoupleSchema = z
  .object({
    maleId   : z.string().min(1, 'Mâle requis'),
    femelleId: z.string().min(1, 'Femelle requise'),
    dateDebut: z.string().min(1, 'Date de début requise'),
    cageId   : z.preprocess(
      (v) => (v === '' || v === undefined || v === null ? null : v),
      z.union([z.string().min(1), z.null()]).optional(),
    ),
    notes    : z.string().optional().default(''),
  })
  .refine((d) => d.maleId !== d.femelleId, {
    message: 'Le mâle et la femelle doivent être deux pigeons distincts.',
    path    : ['femelleId'],
  });

export const ReproductionSchema = z
  .object({
    coupleId         : z.string().min(1, 'Couple requis'),
    datePonte        : z.string().min(1, 'Date de ponte requise'),
    dateEclosion     : z.string().nullable().optional(),
    nombreOeufs      : z.number().int().min(1, 'Nombre d\'œufs requis'),
    nombrePigeonneaux: z.number().int().min(0),
    notes            : z.string().optional().default(''),
  })
  .superRefine((data, ctx) => {
    const ponte = data.datePonte.trim();
    const ecl = data.dateEclosion?.trim();
    if (!ecl) return;
    const dp = Date.parse(`${ponte}T12:00:00`);
    const de = Date.parse(`${ecl}T12:00:00`);
    if (Number.isNaN(dp) || Number.isNaN(de)) return;
    if (de < dp) {
      ctx.addIssue({
        code   : z.ZodIssueCode.custom,
        message: 'La date d’éclosion ne peut pas précéder la date de ponte.',
        path   : ['dateEclosion'],
      });
    }
  });

export const SortieSchema = z.discriminatedUnion('type', [
  z.object({
    type    : z.literal('VENTE'),
    pigeonId: z.string().min(1, 'Pigeon requis'),
    date    : z.string().min(1, 'Date requise'),
    prix    : z.number().min(0, 'Prix requis'),
    acheteur: z.string().min(1, 'Acheteur requis'),
    notes   : z.string().optional().default(''),
  }),
  z.object({
    type    : z.literal('DECES'),
    pigeonId: z.string().min(1, 'Pigeon requis'),
    date    : z.string().min(1, 'Date requise'),
    cause   : z.string().optional().default(''),
    notes   : z.string().optional().default(''),
  }),
  z.object({
    type        : z.literal('PERTE'),
    pigeonId    : z.string().min(1, 'Pigeon requis'),
    date        : z.string().min(1, 'Date requise'),
    circonstance: z.string().optional().default(''),
    notes       : z.string().optional().default(''),
  }),
]);

export type PigeonFormValues        = z.infer<typeof PigeonSchema>;
export type CageFormValues          = z.infer<typeof CageSchema>;
export type CoupleFormValues        = z.infer<typeof CoupleSchema>;
export type ReproductionFormValues  = z.infer<typeof ReproductionSchema>;
export type SortieFormValues        = z.infer<typeof SortieSchema>;
