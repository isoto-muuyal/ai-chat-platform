local Players = game:GetService("Players")

local statuesFolder = workspace:WaitForChild("PejecitosBB")
local REQUIRED_STATUES = 3
local TSHIRT_ASSET = "rbxassetid://117378808037220"

local foundByPlayer = {}
local touchDebounce = {}
local reFoundCooldown = {}
local REFOUND_COOLDOWN_SECONDS = 10

local function giveTShirt(player)
	print("try to give shirt")
	player:SetAttribute("GoldenRewardUnlocked", true)

	local function applyToCharacter(character)
		local existing = character:FindFirstChildOfClass("ShirtGraphic")
		if not existing then
			existing = Instance.new("ShirtGraphic")
			existing.Parent = character
		end
		existing.Graphic = TSHIRT_ASSET
	end

	if player.Character then
		applyToCharacter(player.Character)
	end

	player.CharacterAdded:Connect(function(character)
		if player:GetAttribute("GoldenRewardUnlocked") == true then
			applyToCharacter(character)
		end
	end)
end

local function setupPlayer(player)
	print("setupPlayer")
	foundByPlayer[player.UserId] = {}

	local stats = Instance.new("Folder")
	stats.Name = "leaderstats"
	stats.Parent = player

	local foundCount = Instance.new("IntValue")
	foundCount.Name = "GoldensFound"
	foundCount.Value = 0
	foundCount.Parent = stats

	player:SetAttribute("GoldenRewardUnlocked", false)

	player.CharacterAdded:Connect(function(character)
		if player:GetAttribute("GoldenRewardUnlocked") == true then
			local shirtGraphic = character:FindFirstChildOfClass("ShirtGraphic")
			if not shirtGraphic then
				shirtGraphic = Instance.new("ShirtGraphic")
				shirtGraphic.Parent = character
			end
			shirtGraphic.Graphic = TSHIRT_ASSET
		end
	end)
end

local function onTriggerTouched(statueName, hit)
	print("pejecito bb touched!!", statueName, "hit:", hit.Name, "parent:", hit.Parent and hit.Parent.Name)

	local character = hit:FindFirstAncestorOfClass("Model")
	if not character then
		return
	end

	local player = Players:GetPlayerFromCharacter(character)
	if not player then
		return
	end

	local debounceKey = tostring(player.UserId) .. ":" .. statueName
	if touchDebounce[debounceKey] then
		return
	end
	touchDebounce[debounceKey] = true
	task.delay(1, function()
		touchDebounce[debounceKey] = nil
	end)

	if not foundByPlayer[player.UserId] then
		foundByPlayer[player.UserId] = {}
	end

	if foundByPlayer[player.UserId][statueName] then
		local leaderstats = player:FindFirstChild("leaderstats")
		local foundCount = leaderstats and leaderstats:FindFirstChild("GoldensFound")
		local allFound = foundCount and foundCount.Value >= REQUIRED_STATUES

		if not allFound then
			local now = tick()
			local lastShown = reFoundCooldown[player.UserId] or 0
			if now - lastShown >= REFOUND_COOLDOWN_SECONDS then
				reFoundCooldown[player.UserId] = now
				local char = player.Character
				if char then
					local head = char:FindFirstChild("Head")
					if head then
						game:GetService("Chat"):Chat(head, "Hola de nuevo, sigue buscando.", Enum.ChatColor.Blue)
					end
				end
			end
		end

		return
	end

	foundByPlayer[player.UserId][statueName] = true

	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		print("No leaderstats for", player.Name)
		return
	end

	local foundCount = leaderstats:FindFirstChild("GoldensFound")
	if not foundCount then
		print("No GoldensFound for", player.Name)
		return
	end

	foundCount.Value += 1
	print(player.Name, "found", statueName, "total:", foundCount.Value)

	if foundCount.Value >= REQUIRED_STATUES and player:GetAttribute("GoldenRewardUnlocked") ~= true then
		print("giving shirt to", player.Name)
		giveTShirt(player)
	end
end

for _, statueModel in ipairs(statuesFolder:GetChildren()) do
	if statueModel:IsA("Model") then
		local trigger = statueModel:FindFirstChild("Trigger")
		if trigger and trigger:IsA("BasePart") then
			trigger.Touched:Connect(function(hit)
				print("Trigger touched for", statueModel.Name, "by", hit:GetFullName())
				onTriggerTouched(statueModel.Name, hit)
			end)
		end
	end
end

Players.PlayerAdded:Connect(setupPlayer)

for _, player in ipairs(Players:GetPlayers()) do
	setupPlayer(player)
end

Players.PlayerRemoving:Connect(function(player)
	foundByPlayer[player.UserId] = nil
	reFoundCooldown[player.UserId] = nil
end)

for _, statueModel in ipairs(statuesFolder:GetChildren()) do
	if statueModel:IsA("Model") then
		local trigger = statueModel:FindFirstChild("Trigger")
		local mesh = statueModel:FindFirstChild("Mesh_0")

		if trigger and mesh and trigger:IsA("BasePart") and mesh:IsA("BasePart") then
			print("Fixing trigger for", statueModel.Name)

			-- Move trigger to mesh position
			trigger.Position = mesh.Position + Vector3.new(0, 2, 0)

			-- Resize trigger
			trigger.Size = Vector3.new(6, 6, 6)

			-- Make it visible for debugging
			trigger.Transparency = 1

			-- Physics settings
			trigger.Anchored = true
			trigger.CanCollide = false
			trigger.CanTouch = true
		else
			warn("Missing Mesh_0 or Trigger in", statueModel.Name)
		end
	end
end