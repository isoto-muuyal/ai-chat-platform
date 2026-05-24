-- Server Script: place in ServerScriptService
-- Counts collectibles when a player touches a golden duck or hidden pejecito.

local Players = game:GetService("Players")

local GOLDEN_DUCKS_FOLDER_NAME = "Patos"
local PEJECITOS_FOLDER_NAME = "PejecitosBB"

local GOLDEN_DUCK_NAMES = {
	GoldenDuckNPC = true,
}

local COLLECTIBLE_ID_OVERRIDES = {
	GoldenDuckNPC = "golden-duck",
}

local foundByPlayer = {}
local touchDebounce = {}
local connectedCollectibleIds = {}

local function getOrCreateIntValue(parent, name)
	local value = parent:FindFirstChild(name)
	if value and value:IsA("IntValue") then
		return value
	end

	value = Instance.new("IntValue")
	value.Name = name
	value.Value = 0
	value.Parent = parent

	return value
end

local function setupLeaderstats(player)
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player
	end

	getOrCreateIntValue(leaderstats, "GoldenDucksFound")
	getOrCreateIntValue(leaderstats, "PejecitosFound")

	foundByPlayer[player.UserId] = {}
end

local function getPlayerFromTouchedPart(hit)
	local character = hit:FindFirstAncestorOfClass("Model")
	if not character then
		return nil
	end

	return Players:GetPlayerFromCharacter(character)
end

local function registerFound(player, collectibleType, collectibleId)
	local playerFound = foundByPlayer[player.UserId]
	if not playerFound then
		playerFound = {}
		foundByPlayer[player.UserId] = playerFound
	end

	local key = collectibleType .. ":" .. collectibleId
	if playerFound[key] then
		return
	end

	playerFound[key] = true

	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end

	if collectibleType == "GoldenDuck" then
		local stat = leaderstats:FindFirstChild("GoldenDucksFound")
		if stat then
			stat.Value += 1
		end
	elseif collectibleType == "Pejecito" then
		local stat = leaderstats:FindFirstChild("PejecitosFound")
		if stat then
			stat.Value += 1
		end
	end
end

local function connectTouchablePart(part, collectibleType, collectibleId)
	if not part:IsA("BasePart") then
		return
	end

	part.Touched:Connect(function(hit)
		local player = getPlayerFromTouchedPart(hit)
		if not player then
			return
		end

		local debounceKey = tostring(player.UserId) .. ":" .. collectibleType .. ":" .. collectibleId
		if touchDebounce[debounceKey] then
			return
		end

		touchDebounce[debounceKey] = true
		registerFound(player, collectibleType, collectibleId)

		task.delay(1, function()
			touchDebounce[debounceKey] = nil
		end)
	end)
end

local function shouldConnectCollectible(instance, collectibleType)
	if collectibleType ~= "GoldenDuck" then
		return true
	end

	return GOLDEN_DUCK_NAMES[instance.Name] == true
end

local function getCollectibleId(instance)
	return instance:GetAttribute("CollectibleId") or COLLECTIBLE_ID_OVERRIDES[instance.Name] or instance.Name
end

local function connectCollectible(instance, collectibleType)
	if not shouldConnectCollectible(instance, collectibleType) then
		return
	end

	local collectibleId = getCollectibleId(instance)
	local connectedKey = collectibleType .. ":" .. collectibleId
	if connectedCollectibleIds[connectedKey] then
		warn("Skipping duplicate collectible id:", connectedKey, instance:GetFullName())
		return
	end

	connectedCollectibleIds[connectedKey] = true

	if instance:IsA("BasePart") then
		connectTouchablePart(instance, collectibleType, collectibleId)
		return
	end

	local rootPart = instance:FindFirstChild("HumanoidRootPart")
	if rootPart and rootPart:IsA("BasePart") then
		connectTouchablePart(rootPart, collectibleType, collectibleId)
		return
	end

	for _, descendant in ipairs(instance:GetDescendants()) do
		connectTouchablePart(descendant, collectibleType, collectibleId)
	end
end

local function connectFolder(folderName, collectibleType)
	local folder = workspace:WaitForChild(folderName)

	for _, collectible in ipairs(folder:GetChildren()) do
		connectCollectible(collectible, collectibleType)
	end

	folder.ChildAdded:Connect(function(collectible)
		connectCollectible(collectible, collectibleType)
	end)
end

Players.PlayerAdded:Connect(setupLeaderstats)

Players.PlayerRemoving:Connect(function(player)
	foundByPlayer[player.UserId] = nil
end)

connectFolder(GOLDEN_DUCKS_FOLDER_NAME, "GoldenDuck")
connectFolder(PEJECITOS_FOLDER_NAME, "Pejecito")
