export interface ERPTool {
  name: string;
  description: string;
  parameters: Record<string, string>; // name -> type
  handler: (args: any) => Promise<any>;
}

export class ToolExecutor {
  private static tools = new Map<string, ERPTool>();

  static registerTool(tool: ERPTool) {
    this.tools.set(tool.name, tool);
  }

  static async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`ERP Tool '${name}' is not registered.`);
    
    // Type/Parameter validation
    for (const key of Object.keys(tool.parameters)) {
      if (args[key] === undefined) {
        throw new Error(`Missing parameter '${key}' for tool '${name}'.`);
      }
    }

    try {
      return await tool.handler(args);
    } catch (error: any) {
      console.error(`[TOOL_EXECUTION] Tool '${name}' failed:`, error.message);
      throw error;
    }
  }

  static getRegisteredTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}
