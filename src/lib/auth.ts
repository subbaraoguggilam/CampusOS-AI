import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "campus-os-dev-secret-change-me"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "student" | "faculty" | "hod" | "admin";
  department: string | null;
  studentId: string | null;
  joiningYear: number | null;
  yearOfStudy: number | null;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("campus_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function loginUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    department: user.department,
    studentId: user.studentId,
    joiningYear: user.joiningYear,
    yearOfStudy: user.yearOfStudy,
  };
}

export async function requireAuth(roles?: SessionUser["role"][]) {
  const session = await getSession();
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;
  return session;
}
