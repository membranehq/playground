interface JsonSchema {
  type: string
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  enum?: any[]
}

export function toJsonSchema(
  data: any,
  maxDepth = 5,
  currentDepth = 0
): JsonSchema {
  // Prevent infinite recursion for deeply nested objects
  if (currentDepth >= maxDepth) {
    return { type: "object" }
  }

  // Handle null
  if (data === null) {
    return { type: "null" }
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return {
        type: "array",
        items: { type: "unknown" },
      }
    }

    // Generate schema from first item (representative)
    const firstItemSchema = toJsonSchema(data[0], maxDepth, currentDepth + 1)

    return {
      type: "array",
      items: firstItemSchema,
    }
  }

  // Handle objects
  if (typeof data === "object") {
    const properties: Record<string, JsonSchema> = {}

    // Limit number of properties to show (prevent huge schemas)
    const keys = Object.keys(data).slice(0, 20)

    for (const key of keys) {
      properties[key] = toJsonSchema(data[key], maxDepth, currentDepth + 1)
    }

    const schema: JsonSchema = {
      type: "object",
      properties,
    }

    // Indicate if there are more properties
    if (Object.keys(data).length > 20) {
      properties["..."] = { type: "more properties omitted" }
    }

    return schema
  }

  // Handle primitives
  const primitiveType = typeof data

  switch (primitiveType) {
    case "string":
      return { type: "string" }
    case "number":
      return { type: "number" }
    case "boolean":
      return { type: "boolean" }
    case "undefined":
      return { type: "undefined" }
    default:
      return { type: "unknown" }
  }
}
