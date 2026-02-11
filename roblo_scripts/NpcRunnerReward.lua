-- Server Script: place under the NPC model in Workspace
local PathfindingService = game:GetService("PathfindingService")
local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local NPC_NAME = "RunnerNPC"
local WAYPOINTS_FOLDER = "NPCLocations"
local ROAM_RADIUS = 80
local ROAM_PAUSE = 1
local WALK_SPEED = 12

local DESPAWN_SECONDS = 45
local RESPAWN_SECONDS = 15

local USE_PROMPT_PURCHASE = false
local SHIRT_ASSET_ID = 0
local SHIRT_TEMPLATE = "rbxassetid://123456789"
local REWARD_ATTRIBUTE = "HasNpcShirtReward"

local npcModel = script.Parent
if npcModel.Name ~= NPC_NAME then
	NPC_NAME = npcModel.Name
end

local humanoid = npcModel:WaitForChild("Humanoid")
local rootPart = npcModel:WaitForChild("HumanoidRootPart")
humanoid.WalkSpeed = WALK_SPEED

local prompt = rootPart:FindFirstChild("CatchPrompt")
if not prompt then
	prompt = Instance.new("ProximityPrompt")
	prompt.Name = "CatchPrompt"
	prompt.ActionText = "Catch"
	prompt.ObjectText = "Runner NPC"
	prompt.Parent = rootPart
end

local isHidden = false
local originalParent = npcModel.Parent
local spawnCFrame = rootPart.CFrame

local function getWaypointParts()
	local folder = workspace:FindFirstChild(WAYPOINTS_FOLDER)
	if not folder then
		return {}
	end
	local parts = {}
	for _, child in ipairs(folder:GetChildren()) do
		if child:IsA("BasePart") then
			table.insert(parts, child)
		end
	end
	return parts
end

local function getRandomTarget()
	local waypoints = getWaypointParts()
	if #waypoints > 0 then
		return waypoints[math.random(1, #waypoints)].Position
	end
	local offset = Vector3.new(
		math.random(-ROAM_RADIUS, ROAM_RADIUS),
		0,
		math.random(-ROAM_RADIUS, ROAM_RADIUS)
	)
	return spawnCFrame.Position + offset
end

local function moveTo(position: Vector3)
	local path = PathfindingService:CreatePath()
	path:ComputeAsync(rootPart.Position, position)

	local waypoints = path:GetWaypoints()
	if path.Status ~= Enum.PathStatus.Success or #waypoints == 0 then
		humanoid:MoveTo(position)
		humanoid.MoveToFinished:Wait(4)
		return
	end

	for _, waypoint in ipairs(waypoints) do
		if isHidden then
			return
		end
		humanoid:MoveTo(waypoint.Position)
		humanoid.MoveToFinished:Wait(4)
	end
end

local function hideNpc()
	isHidden = true
	npcModel.Parent = nil
end

local function showNpc()
	npcModel.Parent = originalParent
	rootPart.CFrame = CFrame.new(getRandomTarget())
	isHidden = false
end

local function rewardPlayer(player: Player)
	if player:GetAttribute(REWARD_ATTRIBUTE) then
		return
	end

	if USE_PROMPT_PURCHASE and SHIRT_ASSET_ID > 0 then
		MarketplaceService:PromptPurchase(player, SHIRT_ASSET_ID)
	else
		local character = player.Character or player.CharacterAdded:Wait()
		local shirt = character:FindFirstChildOfClass("Shirt")
		if not shirt then
			shirt = Instance.new("Shirt")
			shirt.Parent = character
		end
		shirt.ShirtTemplate = SHIRT_TEMPLATE
	end

	player:SetAttribute(REWARD_ATTRIBUTE, true)
end

prompt.Triggered:Connect(function(player)
	rewardPlayer(player)
end)

task.spawn(function()
	while true do
		if not isHidden then
			local target = getRandomTarget()
			moveTo(target)
			task.wait(ROAM_PAUSE)
		else
			task.wait(1)
		end
	end
end)

task.spawn(function()
	while true do
		task.wait(DESPAWN_SECONDS)
		hideNpc()
		task.wait(RESPAWN_SECONDS)
		showNpc()
	end
end)
