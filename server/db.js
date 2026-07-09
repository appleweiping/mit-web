import mongoose from "mongoose";

let memoryServer = null;

/**
 * Connect Mongoose to a MongoDB instance.
 *
 * Resolution order:
 *   1. an explicit `uri` argument
 *   2. process.env.MONGO_URI
 *   3. an in-process mongodb-memory-server (zero external services required)
 *
 * The in-memory path is what lets this app — and its test suite — run on a
 * fresh machine with nothing but Node installed.
 */
export async function connectDb(uri) {
  const target = uri || process.env.MONGO_URI;

  if (target) {
    await mongoose.connect(target);
    return { uri: target, inMemory: false };
  }

  // Lazy import so production deployments that set MONGO_URI never load it.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  memoryServer = await MongoMemoryServer.create();
  const memUri = memoryServer.getUri();
  await mongoose.connect(memUri);
  return { uri: memUri, inMemory: true };
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
