import { Types } from 'mongoose';

/**
 * Converts MongoDB IDs to strings and ensures proper date serialization
 * Handles nested documents and arrays recursively
 */
export function convertIdsToStrings<T>(doc: T): T {
  if (!doc) return doc;

  // Handle array of documents
  if (Array.isArray(doc)) {
    return doc.map((item) => convertIdsToStrings(item)) as unknown as T;
  }

  // Handle Mongoose documents
  if (doc && typeof doc === 'object' && '_id' in doc) {
    const docObj = doc as { toObject?: () => any };
    if (typeof docObj.toObject === 'function') {
      return convertIdsToStrings(docObj.toObject()) as T;
    }
    return convertIdsToStrings({ ...doc as any }) as T;
  }

  // Handle nested objects
  if (typeof doc === 'object' && doc !== null) {
    // Handle Date objects
    if (doc instanceof Date) {
      return doc.toISOString() as unknown as T;
    }

    // Handle Buffer (for ObjectId)
    if (Buffer.isBuffer(doc)) {
      try {
        return new Types.ObjectId(doc).toString() as unknown as T;
      } catch (error) {
        console.warn('Failed to convert buffer to ObjectId:', error);
        return doc;
      }
    }

    // Create a new object to avoid modifying the original
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(doc)) {
      // Skip __v field
      if (key === '__v') continue;
      
      // Handle _id field
      if (key === '_id' && value) {
        if (value instanceof Types.ObjectId) {
          result[key] = value.toString();
          result.id = value.toString(); // Add id alias
          continue;
        } else if (value?.buffer) {
          try {
            const buffer = Buffer.isBuffer(value.buffer) 
              ? value.buffer 
              : Buffer.from(Object.values(value.buffer));
            const objectId = new Types.ObjectId(buffer);
            result[key] = objectId.toString();
            result.id = objectId.toString(); // Add id alias
            continue;
          } catch (error) {
            console.warn('Failed to convert buffer to ObjectId:', error);
          }
        }
      }
      
      // Handle Date objects
      if (value instanceof Date) {
        result[key] = value.toISOString();
        continue;
      }
      
      // Handle nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        result[key] = convertIdsToStrings(value);
      } else {
        result[key] = value;
      }
    }
    
    return result as T;
  }
  
  return doc;
}

/**
 * Converts a string ID to MongoDB ObjectId
 * Throws BadRequestException if the ID is invalid
 */
export function toObjectId(id: string | Types.ObjectId): Types.ObjectId {
  try {
    return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
  } catch (error) {
    throw new Error('Invalid ID format');
  }
}
