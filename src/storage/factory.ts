/**
 * Storage factory for creating task storage instances
 */
import { TaskStorage } from '../types/storage.js';
import { SqliteStorage, SqliteConfig, DEFAULT_CONFIG } from './sqlite/index.js';
import { ConfigManager } from '../config/index.js';
import { promises as fs } from 'fs';
import { Logger } from '../logging/index.js';
import { StorageFactoryErrorHandler } from './factory/error-handler.js';
import { PlatformCapabilities } from '../utils/platform-utils.js';

/**
 * Storage factory class for managing singleton storage instance
 */
class StorageFactory {
  private static instance: StorageFactory | null = null;
  private static initializationPromise: Promise<StorageFactory> | null = null;
  private storageInstance: TaskStorage | null = null;
  private static logger: Logger;
  private readonly errorHandler: StorageFactoryErrorHandler;

  private static initLogger(): void {
    if (!StorageFactory.logger) {
      StorageFactory.logger = Logger.getInstance().child({ component: 'StorageFactory' });
    }
  }

  private constructor() {
    StorageFactory.initLogger();
    this.errorHandler = new StorageFactoryErrorHandler();
  }

  /**
   * Gets the StorageFactory instance
   */
  static async getInstance(): Promise<StorageFactory> {
    // Return existing instance if available
    if (StorageFactory.instance) {
      return StorageFactory.instance;
    }

    // If initialization is in progress, wait for it
    if (StorageFactory.initializationPromise) {
      return StorageFactory.initializationPromise;
    }

    // Start new initialization with mutex
    StorageFactory.initializationPromise = (async () => {
      try {
        // Double-check instance hasn't been created while waiting
        if (StorageFactory.instance) {
          return StorageFactory.instance;
        }

        StorageFactory.instance = new StorageFactory();
        return StorageFactory.instance;
      } catch (error) {
        const handler = new StorageFactoryErrorHandler();
        return handler.handleInitError(error, 'getInstance');
      } finally {
        StorageFactory.initializationPromise = null;
      }
    })();

    const instance = await StorageFactory.initializationPromise;
    if (!instance) {
      const handler = new StorageFactoryErrorHandler();
      return handler.handleInitError(
        new Error('Failed to initialize StorageFactory'),
        'getInstance'
      );
    }

    return instance;
  }

  /**
   * Creates or returns the singleton storage instance
   */
  async createStorage(config: SqliteConfig): Promise<TaskStorage> {
    try {
      // Return existing instance if available
      if (this.storageInstance) {
        StorageFactory.logger.debug('Returning existing storage instance');
        return this.storageInstance;
      }

      StorageFactory.logger.info('Creating new storage instance', {
        baseDir: config.baseDir,
        name: config.name,
      });

      // Ensure base directory exists with platform-appropriate permissions
      await fs.mkdir(config.baseDir, {
        recursive: true,
        mode: PlatformCapabilities.getFileMode(0o755),
      });

      // Apply SQLite-specific defaults
      const sqliteConfig: SqliteConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        sqlite: {
          ...DEFAULT_CONFIG.sqlite,
          ...config.sqlite,
        },
        performance: {
          ...DEFAULT_CONFIG.performance,
          ...config.performance,
        },
        connection: {
          ...DEFAULT_CONFIG.connection,
          ...config.connection,
        },
      };

      // Create and initialize storage
      const storage = new SqliteStorage(sqliteConfig);
      await storage.initialize();

      // Only set singleton after successful initialization
      this.storageInstance = storage;
      StorageFactory.logger.info('Storage instance created successfully');
      return storage;
    } catch (error) {
      // Clear storage instance on error
      this.storageInstance = null;
      return this.errorHandler.handleCreateError(error, 'createStorage', { config });
    }
  }

  /**
   * Creates or returns the storage instance with default configuration
   */
  async createDefaultStorage(): Promise<TaskStorage> {
    try {
      // Return existing instance if available
      if (this.storageInstance) {
        StorageFactory.logger.debug('Returning existing default storage instance');
        return this.storageInstance;
      }

      const configManager = ConfigManager.getInstance();
      const config = configManager.getConfig();

      if (!config.storage) {
        return this.errorHandler.handleCreateError(
          new Error('Storage configuration not found in ConfigManager'),
          'createDefaultStorage'
        );
      }

      StorageFactory.logger.info('Creating default storage instance');
      return this.createStorage(config.storage as SqliteConfig);
    } catch (error) {
      return this.errorHandler.handleCreateError(error, 'createDefaultStorage');
    }
  }
}

// Export factory instance creation functions
export async function createStorage(config: SqliteConfig): Promise<TaskStorage> {
  const factory = await StorageFactory.getInstance();
  return factory.createStorage(config);
}

export async function createDefaultStorage(): Promise<TaskStorage> {
  const factory = await StorageFactory.getInstance();
  return factory.createDefaultStorage();
}
