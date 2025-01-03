import { opendir } from 'fs/promises';
import { join } from 'path';

const IGNORE_PATTERNS = new Set([
    'node_modules',
    '.git',
    '.DS_Store',
    'build'
]);

const CHUNK_SIZE = 100; // Process files in chunks
const GC_INTERVAL = 1000; // Run GC every N entries

// Monitor memory usage
function logMemoryUsage() {
    const used = process.memoryUsage();
    console.error('Memory usage:',
        Object.entries(used).map(([key, value]) => 
            `${key}: ${Math.round(value / 1024 / 1024)}MB`
        ).join(', ')
    );
}

// Preallocate buffers to avoid memory churn
const ENTRY_BUFFER = new Array(CHUNK_SIZE);
let bufferIndex = 0;

async function* generateTree(dir, prefix = '', isLast = true, depth = 0) {
    let dirHandle;
    let entries = [];
    
    try {
        // Open directory
        dirHandle = await opendir(dir);
        
        // Collect all valid entries first
        for await (const entry of dirHandle) {
            if (!IGNORE_PATTERNS.has(entry.name)) {
                entries.push(entry);
            }
        }

        // Sort entries (directories first, then alphabetically)
        entries.sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) {
                return b.isDirectory() ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
        });

        // Process entries in chunks
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
            const chunk = entries.slice(i, i + CHUNK_SIZE);
            for (let j = 0; j < chunk.length; j++) {
                const entry = chunk[j];
                const isLastEntry = i + j === entries.length - 1;
                const marker = isLastEntry ? '└── ' : '├── ';
                const newPrefix = prefix + (isLastEntry ? '    ' : '│   ');

                // Yield current entry
                yield prefix + marker + entry.name + (entry.isDirectory() ? '/' : '');

                // Process subdirectories (with depth limit)
                if (entry.isDirectory() && depth < 20) {
                    const subPath = join(dir, entry.name);
                    try {
                        yield* generateTree(subPath, newPrefix, isLastEntry, depth + 1);
                    } catch (error) {
                        if (error.code !== 'ENOENT') {
                            console.error(`Error processing ${subPath}:`, error);
                        }
                    }
                }
            }

            // Run GC after each chunk
            if (global.gc) {
                global.gc();
            }
        }
        
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`Error reading directory ${dir}:`, error);
        }
    } finally {
        // Clean up resources
        if (dirHandle) {
            await dirHandle.close().catch(() => {});
        }
        entries = null;
    }
}

async function* processEntries(buffer, count, dir, prefix, depth) {
    // Sort entries in place
    for (let i = 0; i < count - 1; i++) {
        for (let j = 0; j < count - i - 1; j++) {
            const a = buffer[j];
            const b = buffer[j + 1];
            if ((!a.isDirectory() && b.isDirectory()) || 
                (a.isDirectory() === b.isDirectory() && a.name.localeCompare(b.name) > 0)) {
                buffer[j] = b;
                buffer[j + 1] = a;
            }
        }
    }

    // Process entries
    for (let i = 0; i < count; i++) {
        const entry = buffer[i];
        if (!entry) continue;

        const isLastEntry = i === count - 1;
        const marker = isLastEntry ? '└── ' : '├── ';
        const newPrefix = prefix + (isLastEntry ? '    ' : '│   ');

        // Yield current entry
        yield prefix + marker + entry.name + (entry.isDirectory() ? '/' : '');

        // Process subdirectories (with depth limit)
        if (entry.isDirectory() && depth < 20) {
            yield* generateTree(join(dir, entry.name), newPrefix, isLastEntry, depth + 1);
        }

        // Run GC periodically
        if (i > 0 && i % GC_INTERVAL === 0 && global.gc) {
            global.gc();
        }

        // Clear reference after processing
        buffer[i] = null;
    }
}

async function main() {
    const startTime = Date.now();
    let lineCount = 0;
    
    try {
        // Initial memory snapshot
        logMemoryUsage();
        
        // Process tree
        for await (const line of generateTree(process.cwd())) {
            console.log(line);
            lineCount++;
            
            // Log memory usage periodically
            if (lineCount % 1000 === 0) {
                logMemoryUsage();
            }
        }
        
        // Final memory snapshot
        logMemoryUsage();
        
        // Log statistics
        const duration = Date.now() - startTime;
        console.error(`\nProcessed ${lineCount} entries in ${duration}ms`);
        
    } catch (error) {
        console.error('Error generating tree:', error);
        process.exit(1);
    } finally {
        // Final cleanup
        if (global.gc) {
            global.gc();
        }
    }
}

// Error handlers
const errorHandler = (error) => {
    console.error('Fatal error:', error);
    if (global.gc) {
        global.gc();
    }
    process.exit(1);
};

process.on('uncaughtException', errorHandler);
process.on('unhandledRejection', errorHandler);
process.on('SIGINT', () => {
    console.error('\nProcess interrupted');
    if (global.gc) {
        global.gc();
    }
    process.exit(0);
});

// Start processing
main().catch(errorHandler);
