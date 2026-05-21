-- LocalScript: place in StarterPlayerScripts
-- Shows the latest message board entry sent by MessageBoardServer.lua.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local StarterGui = game:GetService("StarterGui")

local remote = ReplicatedStorage:WaitForChild("MessageBoardEvent")

remote.OnClientEvent:Connect(function(id, message)
	StarterGui:SetCore("SendNotification", {
		Title = "Message Board #" .. tostring(id),
		Text = tostring(message),
		Duration = 8,
	})
end)
