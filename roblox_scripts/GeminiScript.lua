local HttpService = game:GetService("HttpService")
local ProximityPrompt = script.Parent:WaitForChild("GeminiChat")
local ChatService = game:GetService("Chat")
local GeminiEvent = game.ReplicatedStorage:WaitForChild("GeminiEvent")
local LocalizationService = game:GetService("LocalizationService")

local API_URL = "https://npc-api.muuyal.tech/v1/chat/stream"
--local API_URL = HttpService:GetSecret("API_URL")
--local API_KEY = "your-tmp-key"
local API_KEY = "BrYUopNbKoEiMQtbpP9pjbsorVw4YJfV"

--local API_KEY = HttpService:GetSecret("API_KEY")

local SYSTEM_PROMPT = "Eres un 'chairo', fan de la 4T. Responde con humor, ingenio, términos mexicanos y mucha convicción. Máximo 3 frases. No seas grosero."
local ACCOUNT_NUMBER = 100001
--local ACCOUNT_NUMBER = HttpService:getSecret("ACCOUNT_NUMBER")
local SOURCE_CLIENT = "chairo_roblox"
--local SOURCE_CLIENT = HttpService:GetSecret("SGOURCE_CLIENT")

--local npcType = HttpService:GetSecret("CHAIRO_TYPE")

local function parseSSE(body)
	local text = ""
	for line in string.gmatch(body, "[^\n]+") do
		if string.sub(line, 1, 5) == "data:" then
			local jsonStr = string.sub(line, 7)
			local ok, data = pcall(function()
				return HttpService:JSONDecode(jsonStr)
			end)
			if ok and data.text then
				text = text .. data.text
			end
		end
	end
	return text
end

local function getCountry(player)
	local country
	pcall(function()
		country = LocalizationService:GetCountryRegionForPlayerAsync(player)
	end)
	print("Country: ")
	if country == nil then
		print("Variable is nil")
		country = "NA"
	end
	return country
end

local function buildPayload(player, playerMessage)
	print("Building payload for chairo")
	local country = getCountry(player)
	local sessionId = tostring(game.JobId or "")

	local payload = {
		message = SYSTEM_PROMPT .. "\n\nUsuario: " .. playerMessage,
		playerId = tostring(player.UserId),
		accountNumber = ACCOUNT_NUMBER,
		sourceClient = SOURCE_CLIENT,
		clientTimestamp = DateTime.now():ToIsoDate(),
		gender = "unknown",
		location = country and { country = country } or nil
	}

	if sessionId ~= "" then
		payload.sessionId = sessionId
	end

	return payload
end

local function getApiResponse(player, playerMessage)
	print("📡 Server: Calling API for chairo...")

	local body = buildPayload(player, playerMessage)

	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["x-api-key"] = API_KEY
			},
			Body = HttpService:JSONEncode(body)
		})
	end)

	if not success then
		warn("❌ HTTP request failed:", result)
		return "Se cayó el sistema, como el Metro en hora pico."
	end

	if result.StatusCode ~= 200 then
		warn("❌ API HTTP error:", result.StatusCode, result.Body)
		return "Esto no jaló, joven. Luego lo revisamos."
	end

	return parseSSE(result.Body)
end

-- 1. Open UI
ProximityPrompt.Triggered:Connect(function(player)
	print("🔓 Server: Sending OpenUI signal to " .. player.Name)
	-- This triggers the 'OnClientEvent' in your new LocalScript
	GeminiEvent:FireClient(player, "OpenUI", "chairo")
end)

-- 2. Receive from RemoteEvent
GeminiEvent.OnServerEvent:Connect(function(player, mensajeUsuario)
	print("📩 Server: Received event from " .. player.Name .. " with message: " .. mensajeUsuario)

	local head = script.Parent:FindFirstChild("Head")

	if head then
		ChatService:Chat(head, "¡A ver, a ver! Déjame te explico cómo está la cosa...", Enum.ChatColor.Blue)

		local respuestaIA = getApiResponse(player, mensajeUsuario)
		print("🤖 Server: API Responded")
		print(respuestaIA)

		ChatService:Chat(head, respuestaIA, Enum.ChatColor.White)
	else
		warn("❌ NPC Head not found!")
	end
end)

----- MOVEMENT Pato-----

-- Duck movement + fake walking
local TweenService = game:GetService("TweenService")

local duck = script.Parent
local humanoid = duck:WaitForChild("Humanoid")
local root = duck:WaitForChild("HumanoidRootPart")

-- movement settings
humanoid.WalkSpeed = 8
local STEP_DISTANCE = 3
local RANGE_STEPS = 15
local WAIT_MIN = 0.6
local WAIT_MAX = 1.4

-- store original position
local originCFrame = root.CFrame
local originPos = root.Position

-- wobble state
local wobbleTween = nil

-------------------------------------------------
-- WOBBLE (fake walking)
-------------------------------------------------
local function startWobble()
	if wobbleTween then wobbleTween:Cancel() end

	local upCFrame = root.CFrame * CFrame.new(0, 0.15, 0) * CFrame.Angles(0, 0, math.rad(5))

	wobbleTween = TweenService:Create(
		root,
		TweenInfo.new(0.18, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
		{ CFrame = upCFrame }
	)

	wobbleTween:Play()
end

local function stopWobble()
	if wobbleTween then
		wobbleTween:Cancel()
		wobbleTween = nil
	end
end

-------------------------------------------------
-- PICK RANDOM POSITION
-------------------------------------------------
local function getRandomTarget()
	local dx = math.random(-RANGE_STEPS, RANGE_STEPS) * STEP_DISTANCE
	local dz = math.random(-RANGE_STEPS, RANGE_STEPS) * STEP_DISTANCE

	local offset =
		(originCFrame.RightVector * dx) +
		(originCFrame.LookVector * dz)

	return Vector3.new(originPos.X, originPos.Y, originPos.Z) + offset
end

-------------------------------------------------
-- TURN TO FACE TARGET
-------------------------------------------------
local function faceTarget(targetPos)
	local lookAt = Vector3.new(targetPos.X, root.Position.Y, targetPos.Z)
	local targetCFrame = CFrame.lookAt(root.Position, lookAt)

	local turnTween = TweenService:Create(
		root,
		TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{ CFrame = targetCFrame }
	)

	turnTween:Play()
	turnTween.Completed:Wait()
end

-------------------------------------------------
-- MAIN LOOP
-------------------------------------------------
task.spawn(function()
	while duck.Parent do
		local target = getRandomTarget()

		faceTarget(target)
		startWobble()

		humanoid:MoveTo(target)
		humanoid.MoveToFinished:Wait()

		stopWobble()

		task.wait(WAIT_MIN + math.random() * (WAIT_MAX - WAIT_MIN))
	end
end)
