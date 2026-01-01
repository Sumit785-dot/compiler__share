import asyncio
import websockets
import json
import requests
import os

# Login to get token
BASE_URL = "http://127.0.0.1:8001"
USERNAME = "satya1"
PASSWORD = "password123" # Assuming this password, might need to adjust or create a user

async def test_websocket():
    # 1. Login
    print(f"Logging in as {USERNAME}...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login/", json={
            "username": USERNAME, 
            "password": PASSWORD
        })
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
            
        data = response.json()
        token = data.get('tokens', {}).get('access')
        if not token:
            print(f"No token found in response: {data}")
            return
        print("Login successful. Token obtained.")
    except Exception as e:
        print(f"Login error: {e}")
        return

    # 2. Connect to WebSocket
    session_code = "IKDGE0"
    ws_url = f"ws://127.0.0.1:8001/ws/session/{session_code}/?token={token}"
    
    print(f"Connecting to {ws_url}...")
    try:
        async with websockets.connect(ws_url) as websocket:
            print("Connected!")
            
            # Wait for connection confirmed
            response = await websocket.recv()
            print(f"Received: {response}")
            
            # Send a test message
            await websocket.send(json.dumps({
                "type": "heartbeat"
            }))
            print("Sent heartbeat.")
            
            # Close
            await websocket.close()
            print("Closed connection.")
            
    except Exception as e:
        print(f"WebSocket connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
