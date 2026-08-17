import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import unittest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestMultiTenancy(unittest.TestCase):

    def test_health_check(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["data"]["database"], "ok")

    def test_list_societies(self):
        response = client.get("/api/v1/societies")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["data"]), 2)
        slugs = [s["slug"] for s in data["data"]]
        self.assertIn("rm2-residency", slugs)
        self.assertIn("palm-heights", slugs)

    def test_super_admin_login(self):
        response = client.post("/api/v1/auth/login", json={
            "phone": "0000000000",
            "password": "superadmin"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["data"]["user"]["is_super_admin"])
        self.assertGreaterEqual(len(data["data"]["user"]["societies"]), 2)
        self.assertIn("access_token", data["data"])

    def test_society_admin_login_and_switch(self):
        # Login as RM2 Admin
        response = client.post("/api/v1/auth/login", json={
            "phone": "9999999999",
            "password": "admin"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        token = data["data"]["access_token"]
        active_society = data["data"]["active_society_id"]
        self.assertEqual(active_society, 1)

        # Get my societies
        headers = {"Authorization": f"Bearer {token}"}
        soc_res = client.get("/api/v1/auth/my-societies", headers=headers)
        self.assertEqual(soc_res.status_code, 200)
        user_socs = soc_res.json()["data"]
        self.assertGreaterEqual(len(user_socs), 1)
        self.assertEqual(user_socs[0]["id"], 1)

    def test_society_stats(self):
        # Login as Super Admin
        login_res = client.post("/api/v1/auth/login", json={
            "phone": "0000000000",
            "password": "superadmin"
        })
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Fetch stats for RM2 Residency (id=1)
        stats_res = client.get("/api/v1/societies/1/stats", headers=headers)
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()["data"]
        self.assertEqual(stats["society"]["slug"], "rm2-residency")
        self.assertGreaterEqual(stats["flats"]["total"], 256)
        self.assertGreaterEqual(stats["gates_count"], 2)

        # Fetch stats for Palm Heights (id=2)
        stats2_res = client.get("/api/v1/societies/2/stats", headers=headers)
        self.assertEqual(stats2_res.status_code, 200)
        stats2 = stats2_res.json()["data"]
        self.assertEqual(stats2["society"]["slug"], "palm-heights")
        self.assertGreaterEqual(stats2["flats"]["total"], 40)
        self.assertGreaterEqual(stats2["gates_count"], 1)

    def test_tenant_scoping_flats(self):
        # RM2 Flats
        res1 = client.get("/api/v1/flats?society_id=1&per_page=10")
        self.assertEqual(res1.status_code, 200)
        data1 = res1.json()["data"]["items"]
        self.assertGreater(len(data1), 0)
        self.assertTrue(all(f["society_id"] == 1 for f in data1))

        # Palm Heights Flats
        res2 = client.get("/api/v1/flats?society_id=2&per_page=10")
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()["data"]["items"]
        self.assertGreater(len(data2), 0)
        self.assertTrue(all(f["society_id"] == 2 for f in data2))


if __name__ == "__main__":
    unittest.main()
