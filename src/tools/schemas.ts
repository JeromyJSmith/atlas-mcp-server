/**
 * Path-based task management schemas for LLM agents
 */
import { TaskStatus, CONSTRAINTS } from '../types/task.js';

// Schema validation messages
const VALIDATION_MESSAGES = {
  PATH_FORMAT: 'Path can only contain alphanumeric characters, underscores, dots, and hyphens',
  PATH_DEPTH: `Path depth cannot exceed ${CONSTRAINTS.MAX_PATH_DEPTH} levels`,
  NAME_LENGTH: `Name cannot exceed ${CONSTRAINTS.NAME_MAX_LENGTH} characters`,
  DESC_LENGTH: `Description cannot exceed ${CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`,
  NOTE_LENGTH: `Notes cannot exceed ${CONSTRAINTS.NOTE_MAX_LENGTH} characters each`,
  REASONING_LENGTH: `Reasoning cannot exceed ${CONSTRAINTS.REASONING_MAX_LENGTH} characters`,
  DEPENDENCIES_SIZE: `Cannot have more than ${CONSTRAINTS.MAX_DEPENDENCIES} dependencies`,
  SUBTASKS_SIZE: `Cannot have more than ${CONSTRAINTS.MAX_SUBTASKS} subtasks`,
  NOTES_SIZE: `Cannot have more than ${CONSTRAINTS.MAX_NOTES} notes`,
  METADATA_LENGTH: `Metadata string fields cannot exceed ${CONSTRAINTS.METADATA_STRING_MAX_LENGTH} characters`,
  METADATA_ARRAY: `Metadata arrays cannot exceed ${CONSTRAINTS.MAX_ARRAY_ITEMS} items`,
};

/** Creates a new task with path-based hierarchy and validation */
export const createTaskSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description:
        'Hierarchical task path (e.g., "server/api/authentication"). Use paths to organize related tasks.\n' +
        `Constraints:\n` +
        `- ${VALIDATION_MESSAGES.PATH_FORMAT}\n` +
        `- ${VALIDATION_MESSAGES.PATH_DEPTH}`,
      pattern: '^[a-zA-Z0-9_.-]+(?:/[a-zA-Z0-9_.-]+)*$',
      maxLength: CONSTRAINTS.MAX_PATH_DEPTH * 50, // Reasonable max length per segment
    },
    name: {
      type: 'string',
      description:
        'Clear, action-oriented task name (e.g., "Implement JWT authentication", "Refactor database queries").\n' +
        `Maximum length: ${CONSTRAINTS.NAME_MAX_LENGTH} characters`,
      maxLength: CONSTRAINTS.NAME_MAX_LENGTH,
    },
    parentPath: {
      type: 'string',
      description:
        'Path of the parent task. Parent must be MILESTONE or GROUP type.\n' +
        'Examples:\n' +
        '- "project/backend" (under project backend milestone)\n' +
        '- "project/backend/auth" (under auth group)',
    },
    description: {
      type: 'string',
      description:
        'Detailed task description including:\n' +
        '- Objective: What needs to be accomplished\n' +
        '- Context: Why this task is needed\n' +
        '- Technical details: Implementation considerations\n' +
        '- Success criteria: How to verify completion\n' +
        `Maximum length: ${CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`,
      maxLength: CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
    },
    type: {
      type: 'string',
      enum: ['TASK', 'MILESTONE', 'GROUP'],
      description:
        '⚠️ Task Type Hierarchy Rules (MUST BE UPPERCASE):\n\n' +
        '1. MILESTONE (Top Level Container):\n' +
        '   • CAN contain: TASK and GROUP types\n' +
        '   • Purpose: Project phases, major deliverables\n' +
        '   • Example: "Backend Development", "Security Hardening"\n' +
        '   • Status: Completed when all subtasks done\n\n' +
        '2. GROUP (Middle Level Container):\n' +
        '   • CAN contain: Only TASK types\n' +
        '   • CANNOT contain: Other GROUPs or MILESTONEs\n' +
        '   • Purpose: Feature sets, related task collections\n' +
        '   • Example: "Authentication Features", "API Endpoints"\n' +
        '   • Status: Reflects aggregate of subtask states\n\n' +
        '3. TASK (Leaf Level):\n' +
        '   • CANNOT contain any subtasks\n' +
        '   • Purpose: Atomic units of work\n' +
        '   • Example: "Implement JWT", "Add Rate Limiting"\n' +
        '   • Status: Independently managed\n\n' +
        'Common Errors to Avoid:\n' +
        '- Adding subtasks to TASK type\n' +
        '- Adding non-TASK items under GROUP\n' +
        '- Creating circular dependencies\n' +
        '- Exceeding path depth limits',
    },
    dependencies: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-zA-Z0-9_.-]+(?:/[a-zA-Z0-9_.-]+)*$',
      },
      maxItems: CONSTRAINTS.MAX_DEPENDENCIES,
      description:
        'Paths of tasks that must be completed first. Tasks will be automatically blocked if dependencies are not met.\n' +
        `Maximum dependencies: ${CONSTRAINTS.MAX_DEPENDENCIES}\n` +
        'Dependencies can be specified here (recommended) or in metadata.dependencies (legacy).',
      uniqueItems: true,
    },
    metadata: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Task urgency and impact level. Affects task ordering and scheduling.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          maxItems: CONSTRAINTS.MAX_ARRAY_ITEMS,
          description:
            'Keywords for categorization and filtering (e.g., ["api", "security", "optimization"]). Used in path pattern matching.\n' +
            `Maximum tags: ${CONSTRAINTS.MAX_ARRAY_ITEMS}`,
          uniqueItems: true,
        },
        assignee: {
          type: 'string',
          description:
            'System or component responsible for the task. Used for task distribution and filtering.',
        },
        reasoning: {
          type: 'string',
          description:
            'LLM reasoning about task decisions, importance, and approach. Provides context for status changes and dependencies.\n' +
            `Maximum length: ${CONSTRAINTS.REASONING_MAX_LENGTH} characters`,
          maxLength: CONSTRAINTS.REASONING_MAX_LENGTH,
        },
        notes: {
          type: 'array',
          items: {
            type: 'string',
            maxLength: CONSTRAINTS.NOTE_MAX_LENGTH,
          },
          maxItems: CONSTRAINTS.MAX_NOTES,
          description:
            'Additional context, observations, and planning notes. Used to track progress and document decisions.\n' +
            `Maximum notes: ${CONSTRAINTS.MAX_NOTES}\n` +
            `Maximum length per note: ${CONSTRAINTS.NOTE_MAX_LENGTH} characters`,
        },
      },
      description:
        'Additional task context and tracking information. Fields affect:\n' +
        '- Task organization (priority, tags, assignee)\n' +
        '- Progress tracking (notes)\n' +
        '- Decision history (reasoning)\n\n' +
        'Note: dependencies in metadata.dependencies will be migrated to the main dependencies array.',
    },
  },
  required: ['name', 'path'],
};

/** Updates an existing task */
export const updateTaskSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Path of the task to update.',
    },
    updates: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'Updated task name with current action focus.\n' +
            `Maximum length: ${CONSTRAINTS.NAME_MAX_LENGTH} characters`,
          maxLength: CONSTRAINTS.NAME_MAX_LENGTH,
        },
        description: {
          type: 'string',
          description:
            'Updated description with latest context, findings, and next steps.\n' +
            `Maximum length: ${CONSTRAINTS.DESCRIPTION_MAX_LENGTH} characters`,
          maxLength: CONSTRAINTS.DESCRIPTION_MAX_LENGTH,
        },
        type: {
          type: 'string',
          enum: ['TASK', 'MILESTONE', 'GROUP'],
          description:
            '⚠️ Task Type Rules (MUST BE UPPERCASE):\n' +
            '- MILESTONE can contain TASK and GROUP\n' +
            '- GROUP can only contain TASK\n' +
            '- TASK cannot contain subtasks\n' +
            'Changing type may require restructuring subtasks.',
        },
        status: {
          type: 'string',
          enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED'],
          description:
            'Current execution state with strict transition rules:\n\n' +
            'Status Flow:\n' +
            '1. PENDING (Initial State)\n' +
            '   → Can transition to: IN_PROGRESS, BLOCKED\n' +
            '   → Cannot skip to COMPLETED (must track progress)\n\n' +
            '2. IN_PROGRESS (Active State)\n' +
            '   → Can transition to: COMPLETED, FAILED, BLOCKED\n' +
            '   → Required before completion\n\n' +
            '3. BLOCKED (Dependency State)\n' +
            '   → Can transition to: PENDING, IN_PROGRESS\n' +
            '   → Auto-set when dependencies incomplete\n\n' +
            '4. COMPLETED (Terminal State)\n' +
            '   → Must come from IN_PROGRESS\n' +
            '   → Requires all dependencies completed\n\n' +
            '5. FAILED (Terminal State)\n' +
            '   → Can retry by setting to PENDING\n\n' +
            'Status Propagation:\n' +
            '- MILESTONE: Completed when all subtasks done\n' +
            '- GROUP: Status based on subtask states\n' +
            '- TASK: Independent status management\n\n' +
            'Best Practices:\n' +
            '- Always start tasks as PENDING\n' +
            '- Mark as IN_PROGRESS when work begins\n' +
            '- Use BLOCKED for dependency issues\n' +
            '- Complete dependencies before marking COMPLETED',
        },
        dependencies: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_.-]+(?:/[a-zA-Z0-9_.-]+)*$',
          },
          maxItems: CONSTRAINTS.MAX_DEPENDENCIES,
          description:
            'Updated task dependencies. Tasks will be automatically blocked if new dependencies are not met.\n' +
            `Maximum dependencies: ${CONSTRAINTS.MAX_DEPENDENCIES}\n` +
            'Status changes propagate through dependency chain.',
          uniqueItems: true,
        },
        metadata: {
          type: 'object',
          properties: {
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task urgency and impact level. Affects task ordering and scheduling.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              maxItems: CONSTRAINTS.MAX_ARRAY_ITEMS,
              description:
                'Keywords for categorization and filtering (e.g., ["api", "security", "optimization"]). Used in path pattern matching.\n' +
                `Maximum tags: ${CONSTRAINTS.MAX_ARRAY_ITEMS}`,
              uniqueItems: true,
            },
            assignee: {
              type: 'string',
              description: 'Updated system/component assignment',
            },
            reasoning: {
              type: 'string',
              description:
                'LLM reasoning about task decisions, importance, and approach. Provides context for status changes and dependencies.\n' +
                `Maximum length: ${CONSTRAINTS.REASONING_MAX_LENGTH} characters`,
              maxLength: CONSTRAINTS.REASONING_MAX_LENGTH,
            },
            notes: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: CONSTRAINTS.NOTE_MAX_LENGTH,
              },
              maxItems: CONSTRAINTS.MAX_NOTES,
              description:
                'Additional context, observations, and planning notes. Used to track progress and document decisions.\n' +
                `Maximum notes: ${CONSTRAINTS.MAX_NOTES}\n` +
                `Maximum length per note: ${CONSTRAINTS.NOTE_MAX_LENGTH} characters`,
            },
          },
          description:
            'Task metadata fields affect:\n' +
            '- Task organization (priority, tags, assignee)\n' +
            '- Progress tracking (notes)\n' +
            '- Decision history (reasoning)',
        },
      },
      description:
        'Fields to update. Available fields:\n' +
        '- name: Update task name\n' +
        '- description: Update task details\n' +
        '- type: Change task type (task/milestone/group)\n' +
        '- status: Update execution state with automatic dependency checks\n' +
        '- dependencies: Add/remove dependencies with validation\n' +
        '- metadata: Update task metadata (priority, tags, notes, etc.)\n\n' +
        'Status changes trigger:\n' +
        '- Automatic dependency validation\n' +
        '- Status propagation to parent tasks\n' +
        '- Dependent task blocking\n' +
        '- Child task status updates',
    },
  },
  required: ['path', 'updates'],
};

/** Gets tasks by status */
export const getTasksByStatusSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED'] as TaskStatus[],
      description:
        'Filter tasks by their execution state. Use to find tasks needing attention or verify completion.',
    },
    pathPattern: {
      type: 'string',
      description:
        'Optional glob pattern to filter by path (e.g., "server/api/*"). Use to focus on specific subsystems.',
    },
  },
  required: ['status'],
};

/** Gets tasks by path pattern */
export const getTasksByPathSchema = {
  type: 'object',
  properties: {
    pathPattern: {
      type: 'string',
      description:
        'Glob pattern to match task paths. Use to analyze specific areas of work (e.g., "server/*/security/*").',
    },
  },
  required: ['pathPattern'],
};

/** Gets subtasks of a task */
export const getSubtasksSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description:
        'Parent task path. Returns immediate subtasks to analyze task breakdown and progress.',
    },
  },
  required: ['path'],
};

/** Deletes a task */
export const deleteTaskSchema = {
  type: 'object',
  properties: {
    path: {
      type: 'string',
      description: 'Task path to delete. Will recursively remove all subtasks. Use with caution.',
    },
  },
  required: ['path'],
};

/** Clears all tasks from the database */
export const clearAllTasksSchema = {
  type: 'object',
  properties: {
    confirm: {
      type: 'boolean',
      description:
        'Must be set to true to confirm deletion of all tasks. This operation cannot be undone.',
    },
  },
  required: ['confirm'],
};

/** Optimizes database storage and performance */
export const vacuumDatabaseSchema = {
  type: 'object',
  properties: {
    analyze: {
      type: 'boolean',
      description: 'Whether to analyze tables for query optimization after vacuum.',
      default: true,
    },
  },
  required: [],
};

/** Repairs parent-child relationships and fixes inconsistencies */
export const repairRelationshipsSchema = {
  type: 'object',
  properties: {
    dryRun: {
      type: 'boolean',
      description: 'If true, only reports issues without fixing them.',
      default: false,
    },
    pathPattern: {
      type: 'string',
      description: 'Optional glob pattern to limit repair scope (e.g., "project/*").',
    },
  },
  required: [],
};

/** Bulk task operations with validation */
export const bulkTaskSchema = {
  type: 'object',
  properties: {
    operations: {
      type: 'array',
      description:
        'Sequence of atomic task operations with intelligent dependency handling:\n' +
        '- Operations are automatically sorted by dependencies\n' +
        '- Forward-looking dependencies are allowed (deferred validation)\n' +
        '- Dependencies are validated after all tasks are created\n' +
        '- Operations execute in dependency order\n' +
        '- Atomic transaction ensures all-or-nothing execution',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['create', 'update', 'delete'],
            description:
              'Operation type:\n' +
              '- create: Add new task with full context\n' +
              '- update: Modify task with latest findings\n' +
              '- delete: Remove completed or obsolete task',
          },
          path: {
            type: 'string',
            description:
              'Task path for the operation. For create, this sets the desired hierarchy.\n' +
              `Constraints:\n` +
              `- ${VALIDATION_MESSAGES.PATH_FORMAT}\n` +
              `- ${VALIDATION_MESSAGES.PATH_DEPTH}`,
            pattern: '^[a-zA-Z0-9_.-]+(?:/[a-zA-Z0-9_.-]+)*$',
            maxLength: CONSTRAINTS.MAX_PATH_DEPTH * 50,
          },
          data: {
            type: 'object',
            description:
              'Operation-specific data:\n' +
              '- create: Full task definition including dependencies and context\n' +
              '- update: Fields to modify including status and dependencies\n' +
              '- delete: Optional deletion context\n\n' +
              'Dependency handling:\n' +
              '- Dependencies can reference tasks being created in the same batch\n' +
              '- Tasks are created in dependency order automatically\n' +
              '- Circular dependencies are prevented\n' +
              '- Status changes respect dependency constraints\n' +
              '- Failed operations trigger rollback\n\n' +
              'Example - Creating Tasks with Dependencies:\n' +
              '{\n' +
              '  "operations": [\n' +
              '    {\n' +
              '      "type": "create",\n' +
              '      "path": "project/backend/database",\n' +
              '      "data": {\n' +
              '        "name": "Database Setup",\n' +
              '        "type": "TASK"\n' +
              '      }\n' +
              '    },\n' +
              '    {\n' +
              '      "type": "create",\n' +
              '      "path": "project/backend/api",\n' +
              '      "data": {\n' +
              '        "name": "API Development",\n' +
              '        "dependencies": ["project/backend/database"]\n' +
              '      }\n' +
              '    }\n' +
              '  ]\n' +
              '}',
          },
        },
        required: ['type', 'path'],
      },
    },
  },
  required: ['operations'],
};
