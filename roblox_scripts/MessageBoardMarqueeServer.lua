-- Server Script: place in ServerScriptService
-- Listens for board requests from clients, calls the backend, then returns messages.

local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local API_URL = "https://npc-api.muuyal.tech/v1/message-boards"
local API_KEY = "your-account-api-key"
local CACHE_SECONDS = 30

local event = ReplicatedStorage:FindFirstChild("MessageBoardMarqueeEvent")
if not event then
	event = Instance.new("RemoteEvent")
	event.Name = "MessageBoardMarqueeEvent"
	event.Parent = ReplicatedStorage
end

local cachedMessages = nil
local cachedAt = 0

local function normalizeMessages(decoded)
	if type(decoded) ~= "table" then
		return {}
	end

	local source = decoded.messages or decoded
	local messages = {}

	for _, item in ipairs(source) do
		if type(item) == "table" and type(item.message) == "string" and item.message ~= "" then
			table.insert(messages, {
				id = item.id,
				message = item.message,
			})
		elseif type(item) == "string" and item ~= "" then
			table.insert(messages, {
				id = nil,
				message = item,
			})
		end
	end

	return messages
end

local function fetchMessages()
	if cachedMessages and os.time() - cachedAt < CACHE_SECONDS then
		return cachedMessages
	end

	local success, response = pcall(function()
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
		warn("Message board request failed:", response)
		return {}
	end

	if response.StatusCode ~= 200 then
		warn("Message board API error:", response.StatusCode, response.Body)
		return {}
	end

	local decoded = HttpService:JSONDecode(response.Body)
	cachedMessages = normalizeMessages(decoded)
	cachedAt = os.time()

	return cachedMessages
end

event.OnServerEvent:Connect(function(player, action)
	if action ~= "GetMessages" then
		return
	end

	local messages = fetchMessages()
	event:FireClient(player, "Messages", messages)
end)
