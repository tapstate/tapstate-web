/**
 * Compatibility entrypoint for existing imports. Keep the data-node schema in its own module so
 * processor schemas can evolve independently without turning this file into a monolith.
 */
export * from './pipeline-data-node-schema'
