import {
  LoaderArgs,
  LoaderFunction,
  V2_MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { helloGql } from "~/graphql/queries";
import {
  axiosServer,
  lateAccessToken,
  lateRefreshToken,
} from "~/utils/axios.server";
import {
  createUserSession,
  getUserTokens,
  logout,
} from "~/utils/session.server";

export const meta: V2_MetaFunction = () => {
  return [{ title: "New Remix App" }];
};

export const loader: LoaderFunction = async ({ request }: LoaderArgs) => {
  const remixAxios = await axiosServer(request);
  const res = await getUserTokens(request);

  const helloRes = await remixAxios
    .post(
      "graphql",
      {
        query: helloGql,
      },
      {
        headers: {
          Authorization: `Bearer ${res?.accessToken}`,
        },
      }
    )
    .then((res) => {
      return res?.data;
    })
    .catch((err) => {
      return err?.response?.data;
    });

  // if that exported lateAccessToken and lateRefreshToken are available then create a new session and reroute to the current url
  
  // This will work on behalf of "axiosInstance.request(originalRequest)"
  if (lateAccessToken && lateRefreshToken) {
    return createUserSession(lateAccessToken, lateRefreshToken, request.url);
  }

  if (helloRes?.data?.hello) {
    return helloRes.data.hello;
  }

  if (helloRes?.errors[0].message) {
    return logout(request);
  }
};

export default function Index() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix</h1>
      <p>{loaderData}</p>
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
    </div>
  );
}
