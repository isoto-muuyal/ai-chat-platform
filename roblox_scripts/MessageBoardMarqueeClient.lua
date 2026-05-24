-- LocalScript: place under the TextLabel that should move, or under the ScreenGui.
-- If placed under ScreenGui, set MESSAGE_LABEL_NAME to the label that displays board messages.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local EVENT_NAME = "MessageBoardMarqueeEvent"
local MESSAGE_LABEL_NAME = "MessageLabel"
local EMPTY_TEXT = "Mensajes"
local MESSAGE_PAUSE_SECONDS = 1.25
local PIXELS_PER_SECOND = 90
local REFRESH_SECONDS = 60

local event = ReplicatedStorage:WaitForChild(EVENT_NAME)

local function findMessageLabel()
	if script.Parent:IsA("TextLabel") or script.Parent:IsA("TextButton") then
		return script.Parent
	end

	return script.Parent:FindFirstChild(MESSAGE_LABEL_NAME, true)
end

local label = findMessageLabel()
if not label then
	warn("Message board marquee label not found. Rename your TextLabel to " .. MESSAGE_LABEL_NAME)
	return
end

local viewport = label.Parent
viewport.ClipsDescendants = true

label.AnchorPoint = Vector2.new(0, 0.5)
label.TextXAlignment = Enum.TextXAlignment.Left
label.TextWrapped = false
label.AutomaticSize = Enum.AutomaticSize.X
label.Size = UDim2.new(0, 0, label.Size.Y.Scale, label.Size.Y.Offset)

local messages = {}
local running = false

local function getViewportWidth()
	return math.max(viewport.AbsoluteSize.X, 1)
end

local function getLabelWidth()
	return math.max(label.TextBounds.X + 32, 1)
end

local function playOneMessage(text)
	label.Text = text

	task.wait()

	local viewportWidth = getViewportWidth()
	local labelWidth = getLabelWidth()
	local startX = viewportWidth
	local endX = -labelWidth
	local duration = math.max((viewportWidth + labelWidth) / PIXELS_PER_SECOND, 2)

	label.Position = UDim2.fromOffset(startX, viewport.AbsoluteSize.Y / 2)

	local tween = TweenService:Create(
		label,
		TweenInfo.new(duration, Enum.EasingStyle.Linear, Enum.EasingDirection.Out),
		{ Position = UDim2.fromOffset(endX, viewport.AbsoluteSize.Y / 2) }
	)

	tween:Play()
	tween.Completed:Wait()
	task.wait(MESSAGE_PAUSE_SECONDS)
end

local function runMarquee()
	if running then
		return
	end

	running = true

	task.spawn(function()
		while running do
			if #messages == 0 then
				playOneMessage(EMPTY_TEXT)
			else
				for _, item in ipairs(messages) do
					local text = tostring(item.message or "")
					if text ~= "" then
						playOneMessage(text)
					end
				end
			end
		end
	end)
end

event.OnClientEvent:Connect(function(action, nextMessages)
	if action ~= "Messages" then
		return
	end

	if type(nextMessages) == "table" then
		messages = nextMessages
	end

	runMarquee()
end)

task.spawn(function()
	while true do
		event:FireServer("GetMessages")
		task.wait(REFRESH_SECONDS)
	end
end)
