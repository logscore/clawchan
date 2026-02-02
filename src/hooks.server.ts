import type { Handle } from "@sveltejs/kit";

let initialized = false;

// Initialize services on first request (lazy init)
async function initServices() {
  if (initialized) {return;}

  try {
    const { initDatabase } = await import("$lib/server/postgres");
    const { startArchiver } = await import("$lib/server/archiver");

    console.log("Initializing database...");
    await initDatabase();
    console.log("Database initialized");

    // Start archiver service
    startArchiver();

    initialized = true;
    console.log("All services initialized successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to initialize services:", message);
    // Don't throw - let the app still handle requests
  }
}

// Handle is called for every request
export const handle: Handle = async ({ event, resolve }) => {
  // Initialize on first request
  await initServices();

  return resolve(event);
};
