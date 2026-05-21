-- Server Script: place in ServerScriptService
-- Pulls the latest message board entry when a player joins and sends it to that player.

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local API_URL = "https://npc-api.muuyal.tech/v1/message-boards/latest"
local API_KEY = "your-account-api-key"
local CACHE_SECONDS = 30

local remote = ReplicatedStorage:FindFirstChild("MessageBoardEvent")
if not remote then
	remote = Instance.new("RemoteEvent")
	remote.Name = "MessageBoardEvent"
	remote.Parent = ReplicatedStorage
end

local cachedMessage = nil
local cachedAt = 0

local function fetchLatestMessage()
	if cachedMessage and os.time() - cachedAt < CACHE_SECONDS then
		return cachedMessage
	end

	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL,
			Method = "GET",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-key"] = API_KEY,
			},
		})
	end)

	if not success then
		warn("Failed to fetch message board:", result)
		return nil
	end

	if result.StatusCode ~= 200 then
		warn("Message board API error:", result.StatusCode, result.Body)
		return nil
	end

	local decoded = HttpService:JSONDecode(result.Body)
	cachedMessage = decoded
	cachedAt = os.time()

	return cachedMessage
end

Players.PlayerAdded:Connect(function(player)
	local latest = fetchLatestMessage()

	if latest then
		remote:FireClient(player, latest.id, latest.message)
	end
end)
