import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Set role and username for Google auth users (first time login only)
  app.post("/api/auth/set-role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, username } = req.body;

      if (!role || !["teacher", "student"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be 'teacher' or 'student'" });
      }

      if (!username || username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: "Username must be 3-20 characters" });
      }

      // Validate username format (lowercase letters, numbers, underscores only)
      if (!/^[a-z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: "Username can only contain lowercase letters, numbers, and underscores" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Security: Only allow Google auth users who haven't completed setup yet
      if (user.authProvider !== "google") {
        return res.status(403).json({ error: "Role can only be set for Google login users" });
      }

      // Allow role selection if user doesn't have a username yet (hasn't completed setup)
      if (user.username) {
        return res.status(403).json({ error: "Account setup has already been completed" });
      }

      // Check if username is already taken
      const existingUser = await authStorage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      // Update user role and username
      const updatedUser = await authStorage.updateUserRoleAndUsername(userId, role, username);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error setting user role:", error);
      res.status(500).json({ message: "Failed to set user role" });
    }
  });
}
