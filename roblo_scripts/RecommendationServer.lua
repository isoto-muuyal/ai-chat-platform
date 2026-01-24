-- Server Script: place under the mailbox model in Workspace
local HttpService = game:GetService("HttpService")
local ProximityPrompt = script.Parent:WaitForChild("RecommendationPrompt")
local RecommendationEvent = game.ReplicatedStorage:WaitForChild("RecommendationEvent")

local API_URL = "https://npc-api.muuyal.tech/v1/recommendations"
local API_KEY = "your-tmp-key"
local ACCOUNT_NUMBER = 100001
local SOURCE_CLIENT = "roblox"

local function buildPayload(player, ideas, sourceType)
	return {
		accountNumber = ACCOUNT_NUMBER,
		robloxUserId = player.UserId,
		ideas = ideas,
		sourceType = sourceType ~= "" and sourceType or SOURCE_CLIENT,
	}
end

local function postRecommendation(player, ideas, sourceType)
	local payload = buildPayload(player, ideas, sourceType)

	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-key"] = API_KEY,
			},
			Body = HttpService:JSONEncode(payload),
		})
	end)

	if not success then
		warn("❌ HTTP request failed:", result)
		return false, "Request failed"
	end

	if result.StatusCode ~= 200 then
		warn("❌ API HTTP error:", result.StatusCode, result.Body)
		return false, "API error"
	end

	return true, "OK"
end

ProximityPrompt.Triggered:Connect(function(player)
	RecommendationEvent:FireClient(player, "OpenUI")
end)

RecommendationEvent.OnServerEvent:Connect(function(player, ideas, sourceType)
	if type(ideas) ~= "string" or ideas == "" then
		return
	end

	local ok, message = postRecommendation(player, ideas, sourceType or "")
	RecommendationEvent:FireClient(player, "Result", ok, message)
end)
