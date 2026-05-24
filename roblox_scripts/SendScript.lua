local button = script.Parent
local inputBox = button.Parent:WaitForChild("InputBox")
local ChairoEvent = game.ReplicatedStorage:WaitForChild("GeminiEvent")
local DerechairoEvent = game.ReplicatedStorage:WaitForChild("DereGeminiEvent")
local screenGui = button.Parent.Parent
local Players = game:GetService("Players")
local player = Players.LocalPlayer

button.MouseButton1Click:Connect(function()
	print("send button clicked from StarterGui")
	local mensaje = inputBox.Text
	if mensaje ~= "" then
		print("sending message to server")
		
		local activeNPC = player:GetAttribute("ActiveNPC")
		print("Active NPC:", activeNPC)
		
		-- Enviamos el texto al NPC
		if activeNPC == "chairo" then
			ChairoEvent:FireServer(mensaje)
		elseif activeNPC == "derechairo" then
			DerechairoEvent:FireServer(mensaje)
		else
			warn("❌ No ActiveNPC set")
			return
		end
		
		-- Limpiamos y cerramos la ventana
		inputBox.Text = ""
		screenGui.Enabled = false -- disable chat gui
		--script.Parent.Parent.Parent.Enabled = false
		print("message sent")
	end
end)