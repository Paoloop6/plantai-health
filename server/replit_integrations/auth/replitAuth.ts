import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL / 1000, // connect-pg-simple expects seconds
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Always use secure cookies for OAuth
      sameSite: "lax",
      maxAge: SESSION_TTL,
    },
  });
}

function getCallbackURL(): string {
  // Use explicit callback URL if provided
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  // Default to /callback for custom domains
  return "https://plantai-health.com/callback";
}

async function upsertUser(profile: any) {
  const email = profile.emails?.[0]?.value;
  const firstName = profile.name?.givenName || null;
  const lastName = profile.name?.familyName || null;
  const profileImageUrl = profile.photos?.[0]?.value || null;

  await authStorage.upsertUser({
    id: profile.id,
    email,
    firstName,
    lastName,
    profileImageUrl,
  });
}

export async function setupAuth(app: Express, options?: { skipSessionSetup?: boolean }) {
  app.set("trust proxy", 1);
  
  if (!options?.skipSessionSetup) {
    app.use(getSession());
  }
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: getCallbackURL(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          await upsertUser(profile);
          const user = {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
            accessToken,
            refreshToken,
          };
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  // Serialize only user ID to session - we don't need tokens for login-only OAuth
  passport.serializeUser((user: any, cb) => {
    cb(null, { id: user.id });
  });

  // Deserialize by fetching fresh user data from DB
  passport.deserializeUser(async (data: { id: string }, cb) => {
    try {
      const user = await authStorage.getUser(data.id);
      if (user) {
        // Add claims.sub for backward compatibility with existing code
        cb(null, { ...user, claims: { sub: user.id } });
      } else {
        cb(null, null);
      }
    } catch (error) {
      cb(error);
    }
  });

  app.get("/api/login", passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }));

  app.get("/callback", passport.authenticate("google", {
    failureRedirect: "/login",
  }), async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (userId) {
        const dbUser = await authStorage.getUser(userId);
        // Check if user has completed setup (has username)
        if (dbUser && !dbUser.username) {
          return res.redirect("/select-role");
        }
      }
      return res.redirect("/home");
    } catch (error) {
      console.error("Error in callback:", error);
      return res.redirect("/home");
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
