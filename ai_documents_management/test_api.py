import httpx
import asyncio

async def test():
    # Login as admin to get token
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@example.com",
            "password": "password123"
        })
        if resp.status_code != 200:
            print("Login failed:", resp.text)
            return
        token = resp.json()["access_token"]
        
        # Get guidelines
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.get("/api/v1/guidelines/", headers=headers)
        if resp.status_code != 200:
            print("Get guidelines failed:", resp.text)
            return
            
        data = resp.json()
        print(f"Total guidelines: {data['total']}")
        for item in data["items"]:
            print(f"Guideline: {item['title'][:30]}... - Authors: {item['authors']}")

asyncio.run(test())
