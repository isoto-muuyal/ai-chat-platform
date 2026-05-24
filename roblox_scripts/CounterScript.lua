local player = game.Players.LocalPlayer

local frame = script.Parent:WaitForChild("Frame")
local goldenDucksCounter = frame:WaitForChild("GansosDoradosCounter")
local pejecitosCounter = frame:WaitForChild("PejecitosCounter")

local TOTAL_GOLDEN_DUCKS = 2
local TOTAL_PEJECITOS = 3
local ENCOURAGEMENT_COOLDOWN = 10

local congratsShown = { ducks = false, pejes = false }
local lastEncouragementTime = 0

local function refreshDisplay()
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end

	local pejes = leaderstats:FindFirstChild("PejecitosFound")
	local ducks = leaderstats:FindFirstChild("GoldenDucksFound")

	if pejes then
		pejecitosCounter.Text = tostring(pejes.Value) .. "/" .. tostring(TOTAL_PEJECITOS)
	end

	if ducks then
		goldenDucksCounter.Text = tostring(ducks.Value) .. "/" .. tostring(TOTAL_GOLDEN_DUCKS)
	end
end

local function onStatChanged()
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end

	local pejes = leaderstats:FindFirstChild("PejecitosFound")
	local ducks = leaderstats:FindFirstChild("GoldenDucksFound")

	if pejes then
		pejecitosCounter.Text = tostring(pejes.Value) .. "/" .. tostring(TOTAL_PEJECITOS)

		if pejes.Value >= TOTAL_PEJECITOS then
			if not congratsShown.pejes then
				congratsShown.pejes = true
				game:GetService("StarterGui"):SetCore("SendNotification", {
					Title = "¡Felicidades!",
					Text = "¡Encontraste todos los Pejecitos BB!",
					Duration = 5,
				})
			end
		elseif pejes.Value > 0 then
			local now = tick()
			if now - lastEncouragementTime >= ENCOURAGEMENT_COOLDOWN then
				lastEncouragementTime = now
				game:GetService("StarterGui"):SetCore("SendNotification", {
					Title = "¡Sigue buscando!",
					Text = "¡Encontraste " .. pejes.Value .. "/" .. TOTAL_PEJECITOS .. " Pejecitos BB!",
					Duration = 4,
				})
			end
		end
	end

	if ducks then
		goldenDucksCounter.Text = tostring(ducks.Value) .. "/" .. tostring(TOTAL_GOLDEN_DUCKS)

		if ducks.Value >= TOTAL_GOLDEN_DUCKS and not congratsShown.ducks then
			congratsShown.ducks = true
			game:GetService("StarterGui"):SetCore("SendNotification", {
				Title = "¡Felicidades!",
				Text = "¡Encontraste todos los Patos Dorados!",
				Duration = 5,
			})
		end
	end
end

local function connectStats()
	local leaderstats = player:FindFirstChild("leaderstats")
	if not leaderstats then
		return
	end

	for _, stat in ipairs(leaderstats:GetChildren()) do
		if stat:IsA("IntValue") then
			stat.Changed:Connect(onStatChanged)
		end
	end

	leaderstats.ChildAdded:Connect(function(stat)
		if stat:IsA("IntValue") then
			stat.Changed:Connect(onStatChanged)
			refreshDisplay()
		end
	end)
end

player.ChildAdded:Connect(function(child)
	if child.Name == "leaderstats" then
		connectStats()
		refreshDisplay()
	end
end)

task.wait(1)
connectStats()
refreshDisplay()
