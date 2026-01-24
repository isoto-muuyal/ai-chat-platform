-- LocalScript: place under StarterGui/RecommendationUI
local RecommendationEvent = game.ReplicatedStorage:WaitForChild("RecommendationEvent")

local screenGui = script.Parent
local container = screenGui:WaitForChild("Container")
local ideasBox = container:WaitForChild("IdeasBox")
local sourceBox = container:WaitForChild("SourceBox")
local submitButton = container:WaitForChild("SubmitButton")
local closeButton = container:WaitForChild("CloseButton")
local statusLabel = container:FindFirstChild("StatusLabel")

local function setStatus(text)
	if statusLabel and statusLabel:IsA("TextLabel") then
		statusLabel.Text = text
	end
end

local function openUI()
	screenGui.Enabled = true
	setStatus("")
end

local function closeUI()
	screenGui.Enabled = false
end

submitButton.MouseButton1Click:Connect(function()
	local ideas = ideasBox.Text
	if ideas == "" then
		setStatus("Write a recommendation first.")
		return
	end

	local sourceType = sourceBox.Text
	setStatus("Sending...")
	RecommendationEvent:FireServer(ideas, sourceType)
end)

closeButton.MouseButton1Click:Connect(function()
	closeUI()
end)

RecommendationEvent.OnClientEvent:Connect(function(action, ok, message)
	if action == "OpenUI" then
		openUI()
		return
	end

	if action == "Result" then
		if ok then
			setStatus("Sent.")
			ideasBox.Text = ""
			sourceBox.Text = ""
			closeUI()
		else
			setStatus("Error: " .. tostring(message))
		end
	end
end)
