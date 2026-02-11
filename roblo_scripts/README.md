Roblox Recommendations UI (Mailbox)

Goal
- A mailbox ProximityPrompt opens a GUI where the player writes a recommendation.
- Submit sends the data to your API: POST /v1/recommendations.

Scripts in this folder
- RecommendationServer.lua (Server Script)
- RecommendationClient.lua (LocalScript)

Setup steps (Studio)
1) Enable HttpService
   - Home > Game Settings > Security > Enable "Allow HTTP Requests".

2) Create a RemoteEvent
   - In ReplicatedStorage, create a RemoteEvent named RecommendationEvent.

3) Mailbox model (Workspace)
   - Add a ProximityPrompt named RecommendationPrompt under the mailbox (or any part).
   - Insert RecommendationServer.lua as a Script under the mailbox model.
   - Make sure the Script.Parent contains the ProximityPrompt.

4) UI (StarterGui)
   - Create a ScreenGui named RecommendationUI.
   - Inside it, add:
     - Frame named Container
     - TextBox named IdeasBox (multi-line, clear text on submit)
     - TextBox named SourceBox (optional; default "roblox")
     - TextButton named SubmitButton
     - TextButton named CloseButton
     - (Optional) TextLabel named StatusLabel
   - Insert RecommendationClient.lua as a LocalScript under RecommendationUI.

5) Wire object names
   - The scripts assume these names:
     - ScreenGui: RecommendationUI
     - TextBox: IdeasBox
     - TextBox: SourceBox
     - TextButton: SubmitButton
     - TextButton: CloseButton
     - TextLabel (optional): StatusLabel
     - ProximityPrompt: RecommendationPrompt
     - RemoteEvent: RecommendationEvent

6) Configure constants (Server Script)
   - API_URL: "https://npc-api.muuyal.tech/v1/recommendations"
   - API_KEY: your account API key (keep on server)
   - ACCOUNT_NUMBER: your account number (number)
   - SOURCE_CLIENT: default source if SourceBox is empty

Payload sent to API
{
  "accountNumber": 100001,
  "robloxUserId": 123456,
  "ideas": "text here",
  "sourceType": "roblox"
}

Notes
- Only the Server Script should store the API key.
- LocalScript only opens/closes UI and sends the text to the server via RemoteEvent.

Runner NPC (random roam + disappear + reward)
- Script: NpcRunnerReward.lua (Server Script)
- Place under the NPC model (Workspace).
- NPC must have: Humanoid + HumanoidRootPart.
- Optional: ProximityPrompt named CatchPrompt under HumanoidRootPart.
- Optional: create Workspace folder "NPCLocations" with Parts as waypoints.
- Configure:
  - SHIRT_TEMPLATE = "rbxassetid://<your shirt template id>"
  - Or set USE_PROMPT_PURCHASE = true and SHIRT_ASSET_ID for paid items.
