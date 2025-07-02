/**
 * Parameter adapter for Zapier MCP tools
 * Handles parameter conversion and mapping for different tool types
 */

export interface ZapierToolParameter {
  name: string;
  value: any;
  schema?: any;
}

export class ZapierMCPParameterAdapter {
  /**
   * Adapt parameters based on tool name and schema
   */
  static adaptParameters(toolName: string, params: any, toolSchema?: any): any {
    const adaptedParams: any = {};
    
    // Handle common parameter mappings
    switch (toolName) {
      case 'youtube_find_video':
        return this.adaptYouTubeFindVideo(params);
        
      case 'youtube_search':
        return this.adaptYouTubeSearch(params);
        
      case 'instagram_post':
      case 'instagram_publish':
        return this.adaptInstagramPost(params);
        
      case 'facebook_post':
      case 'facebook_publish':
        return this.adaptFacebookPost(params);
        
      default:
        // Generic adaptation based on schema
        return this.adaptGeneric(params, toolSchema);
    }
  }
  
  /**
   * Adapt parameters for YouTube find video tool
   */
  private static adaptYouTubeFindVideo(params: any): any {
    const adapted: any = {};
    
    // The instructions parameter is required and describes what to find
    if (params.query || params.channel || params.search) {
      adapted.instructions = params.query || 
                           `Find videos from ${params.channel || 'the channel'}` ||
                           params.search;
    } else {
      adapted.instructions = 'Find the latest videos';
    }
    
    // Convert max_results to string if provided as number
    if (params.max_results !== undefined) {
      adapted.max_results = String(params.max_results);
    } else if (params.maxResults !== undefined) {
      adapted.max_results = String(params.maxResults);
    } else {
      adapted.max_results = '10'; // Default
    }
    
    // Add any other parameters that might be in the original
    Object.keys(params).forEach(key => {
      if (!['query', 'channel', 'search', 'max_results', 'maxResults'].includes(key)) {
        adapted[key] = params[key];
      }
    });
    
    return adapted;
  }
  
  /**
   * Adapt parameters for YouTube search
   */
  private static adaptYouTubeSearch(params: any): any {
    const adapted: any = {};
    
    // Similar to find video but might have different requirements
    adapted.instructions = params.query || params.instructions || 'Search YouTube';
    
    if (params.max_results !== undefined) {
      adapted.max_results = String(params.max_results);
    }
    
    return adapted;
  }
  
  /**
   * Adapt parameters for Instagram posting
   */
  private static adaptInstagramPost(params: any): any {
    const adapted: any = {};
    
    // Map common parameters to Instagram-specific ones
    if (params.contentUrl || params.image_url || params.media_url) {
      adapted.image_url = params.contentUrl || params.image_url || params.media_url;
    }
    
    if (params.caption || params.text || params.message) {
      adapted.caption = params.caption || params.text || params.message;
    }
    
    if (params.hashtags) {
      if (Array.isArray(params.hashtags)) {
        adapted.hashtags = params.hashtags.join(' ');
      } else {
        adapted.hashtags = params.hashtags;
      }
    }
    
    // Add instructions if required
    adapted.instructions = params.instructions || 
                          `Post to Instagram with caption: ${adapted.caption || 'No caption'}`;
    
    return adapted;
  }
  
  /**
   * Adapt parameters for Facebook posting
   */
  private static adaptFacebookPost(params: any): any {
    const adapted: any = {};
    
    // Map parameters
    if (params.contentUrl || params.content_url || params.media_url) {
      adapted.content_url = params.contentUrl || params.content_url || params.media_url;
    }
    
    if (params.caption || params.message || params.text) {
      adapted.message = params.caption || params.message || params.text;
    }
    
    if (params.contentType || params.content_type) {
      adapted.content_type = params.contentType || params.content_type;
    }
    
    // Add page selection if specified
    if (params.page || params.facebook_page) {
      adapted.page = params.page || params.facebook_page;
    }
    
    // Add instructions
    adapted.instructions = params.instructions || 
                          `Post to Facebook${adapted.page ? ' page ' + adapted.page : ''}`;
    
    return adapted;
  }
  
  /**
   * Generic parameter adaptation based on schema
   */
  private static adaptGeneric(params: any, schema?: any): any {
    const adapted: any = {};
    
    // If we have a schema, use it to guide adaptation
    if (schema?.properties) {
      Object.entries(schema.properties).forEach(([paramName, paramSchema]) => {
        const schemaObj = paramSchema as any;
        
        // Check if parameter is provided in various forms
        let value = params[paramName];
        
        // Try alternative names
        if (value === undefined) {
          const camelCase = this.toCamelCase(paramName);
          const snakeCase = this.toSnakeCase(paramName);
          
          value = params[camelCase] || params[snakeCase];
        }
        
        // Apply type conversion based on schema
        if (value !== undefined) {
          adapted[paramName] = this.convertType(value, schemaObj.type);
        } else if (schema.required?.includes(paramName)) {
          // Handle required parameters
          if (paramName === 'instructions') {
            adapted[paramName] = this.generateInstructions(params);
          } else if (schemaObj.default !== undefined) {
            adapted[paramName] = schemaObj.default;
          }
        }
      });
    } else {
      // No schema, pass through with basic type conversions
      Object.entries(params).forEach(([key, value]) => {
        adapted[key] = value;
      });
    }
    
    return adapted;
  }
  
  /**
   * Convert value to the expected type
   */
  private static convertType(value: any, expectedType: string): any {
    switch (expectedType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'integer':
        return Math.floor(Number(value));
      default:
        return value;
    }
  }
  
  /**
   * Generate instructions parameter from other parameters
   */
  private static generateInstructions(params: any): string {
    // Try to create meaningful instructions from available parameters
    if (params.query) {
      return params.query;
    }
    
    if (params.action) {
      return `Perform action: ${params.action}`;
    }
    
    if (params.platform && params.content) {
      return `Post to ${params.platform}: ${params.content}`;
    }
    
    // Generic fallback
    return 'Execute the requested action';
  }
  
  /**
   * Convert snake_case to camelCase
   */
  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  
  /**
   * Convert camelCase to snake_case
   */
  private static toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  /**
   * Validate parameters against schema
   */
  static validateParameters(params: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required parameters
    if (schema.required) {
      for (const required of schema.required) {
        if (params[required] === undefined || params[required] === null) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }
    
    // Check parameter types
    if (schema.properties) {
      Object.entries(params).forEach(([key, value]) => {
        const paramSchema = schema.properties[key];
        if (paramSchema) {
          const expectedType = (paramSchema as any).type;
          const actualType = typeof value;
          
          // Basic type checking
          if (expectedType && !this.isValidType(value, expectedType)) {
            errors.push(`Parameter ${key} should be ${expectedType} but got ${actualType}`);
          }
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if value matches expected type
   */
  private static isValidType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
      case 'integer':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}