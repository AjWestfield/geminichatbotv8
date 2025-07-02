import { MCPClientWrapper } from "../lib/mcp/mcp-client";

async function main() {
  const config = {
    id: "todo-manager-test",
    name: "Todo Manager",
    command: "node",
    args: ["example-servers/todo-manager/dist/index.js"],
    env: {},
  } as const;

  const client = new MCPClientWrapper(config);

  try {
    console.log("[Test] Connecting to Todo Manager server via MCP client wrapper…");
    await client.connect();
    console.log("[Test] Connected ✓");

    const tools = await client.listTools();
    console.log(`[Test] Tool count: ${tools.length}`);

    const resources = await client.listResources();
    console.log(`[Test] Resource count: ${resources.length}`);

    console.log("[Test] Disconnecting…");
    await client.disconnect();
    console.log("[Test] Disconnected ✓");
  } catch (error) {
    console.error("[Test] Error:", error);
    process.exit(1);
  }
}

main();
