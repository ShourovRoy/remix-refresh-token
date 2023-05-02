import {
  createCookie,
  createCookieSessionStorage,
  redirect,
} from "@remix-run/node";
import { axiosServer } from "./axios.server";
import { loginUserGql } from "~/graphql/queries";

export const useSession = async () => {
  const session = await storage.getSession();

  return session;
};

export const userLoginRequest = async (
  email: string,
  password: string,
  request: Request
) => {
  const remixAxios = await axiosServer(request);

  const loginRes = await remixAxios
    .post("graphql", {
      query: loginUserGql,
      variables: {
        loginUserInput: {
          email: email,
          password: password,
        },
      },
    })
    .then((res) => res.data);

  return loginRes;
};

// creating a session
const sessionSecret = "hey_buddy";
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set");
}

// creating a storage
const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_SESSION",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

// creating and setting the tokens in the session
export const createUserSession = async (
  accessToken: string,
  refreshToken: string,
  redirectTo: string
) => {
  const session = await useSession();

  session.set("access_token", accessToken);
  session.set("refresh_token", refreshToken);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
};

// get user session
function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserTokens(request: Request) {
  const session = await getUserSession(request);
  const accessToken = session.get("access_token");
  const refreshToken = session.get("refresh_token");
  if (
    !accessToken ||
    typeof accessToken !== "string" ||
    !refreshToken ||
    typeof refreshToken !== "string"
  )
    return null;
  return {
    accessToken,
    refreshToken,
  };
}

export const cookie = createCookie("cookie-name", {
  // all of these are optional defaults that can be overridden at runtime
  domain: "remix.run",
  expires: new Date(Date.now() + 60_000),
  httpOnly: true,
  maxAge: 60,
  path: "/",
  sameSite: "lax",
  secrets: ["s3cret1"],
  secure: true,
});


export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

