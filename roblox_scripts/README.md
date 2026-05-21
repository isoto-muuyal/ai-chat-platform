Roblox Message Board Scripts

Goal
- Pull the latest message board entry when a player joins.
- Keep the API key only in a server Script.
- Send the result to the player through a RemoteEvent.

Scripts
- MessageBoardServer.lua: place in ServerScriptService.
- MessageBoardClient.lua: place in StarterPlayerScripts.

Setup
1. Enable HTTP requests in Roblox Studio:
   Home > Game Settings > Security > Allow HTTP Requests.

2. Add MessageBoardServer.lua to ServerScriptService.

3. Add MessageBoardClient.lua to StarterPlayerScripts.

4. Configure MessageBoardServer.lua:
   - API_URL: your backend endpoint, expected to return the latest message.
   - API_KEY: your account API key.

Expected API response
{
  "id": 123,
  "message": "Latest message text"
}

Notes
- The current dashboard endpoint /api/message-boards uses browser session auth and is not suitable for Roblox.
- Add a server-to-server endpoint such as GET /v1/message-boards/latest that accepts x-api-key.
- MessageBoardServer.lua caches the latest result for 30 seconds to avoid a request per player during join bursts.
