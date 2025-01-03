import { z } from 'zod';
import { PathValidator } from '../../../validation/index.js';
import { CONSTRAINTS } from '../../../types/task.js';
import { taskMetadataSchema } from './metadata-schema.js';
import { TaskType } from '../../../types/task.js';

// Initialize path validator for schema validation
const pathValidator = new PathValidator({
  maxDepth: CONSTRAINTS.MAX_PATH_DEPTH,
  maxLength: 1000,
  allowedCharacters: /^[a-zA-Z0-9-_/]+$/,
  projectNamePattern: /^[a-zA-Z][a-zA-Z0-9-_]*$/,
  maxProjectNameLength: 100,
});

/**
 * Schema for task creation input
 */
export const createTaskSchema = z.object({
  path: z.string().refine(
    path => {
      const result = pathValidator.validatePath(path);
      return result.isValid;
    },
    path => ({ message: pathValidator.validatePath(path).error || 'Invalid path format' })
  ),
  name: z.string().min(1).max(200),
  parentPath: z
    .string()
    .refine(
      path => {
        const result = pathValidator.validatePath(path);
        return result.isValid;
      },
      path => ({ message: pathValidator.validatePath(path).error || 'Invalid parent path format' })
    )
    .optional(),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(TaskType).optional(),
  notes: z.array(z.string().max(1000)).max(100).optional(),
  reasoning: z.string().max(2000).optional(),
  dependencies: z.array(z.string()).max(50).optional(),
  metadata: taskMetadataSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
