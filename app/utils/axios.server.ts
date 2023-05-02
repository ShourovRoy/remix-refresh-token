import axios from "axios";
import { createUserSession, getUserTokens } from "./session.server";

export const axiosBase = axios;

// create a axios without any interceptor for calling inside the interceptor
// Calling axios instance inside the interceptor will recall the interceptor and stuck into a loop
axiosBase.defaults.baseURL = "http://localhost:3000/";
axiosBase.defaults.withCredentials = true;

// after refreshing the tokens I want to set the new tokens in the cookies
// And as we can't set or create cookies outside of loader and action function we need to export it and keep watching on it
export let lateAccessToken: string | null;
export let lateRefreshToken: string | null;

// This is the function that will be used in the loader and action function to get the axios instance
// We can't use Remix request here so we need to pass it as an argument to extract the access token and refreshtoken from existing cookies
export const axiosServer = async (remixRequest: Request) => {
  // getting the tokens from the cookies session from the remixRequest
  const res = await getUserTokens(remixRequest);

  // withCredentials: true for the axios instance so that it can send the cookies with the request if the server and client are on the same domain or subdomain
  const axiosInstance = axios.create({
    baseURL: "http://localhost:3000/",
    withCredentials: true,
  });

  axiosInstance.interceptors.response.use(
    async (config) => {
      // If the server and client are not on the same domain or subdomain then we need to set the access token in the header
      config.headers.Authorization = `Bearer ${res?.accessToken}`;
      return config;
    },
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response.status === 401 &&
        originalRequest &&
        !originalRequest._isRetry
      ) {
        originalRequest._isRetry = true;

        // get the existing refresh token from the cookies session of remixRequest
        const newRefreshToken = res?.refreshToken;

        // request for new access token and refresh token
        // In this case I am using graphql but you can use any api route
        // Note: You need to set the existing refresh token in the header if the server and client are not on the same domain or subdomain
        // Note 2: Do not use aciosInstance here as it will recall in a loop
        const refRes = await axiosBase.post(
          "graphql",
          {
            query: `
                  query {
                    refreshToken {
                      accessToken
                      refreshToken
                    }
                  }
            `,
          },
          {
            headers: {
              // In the header we need to set the existing refresh token
              // Incase if the server and client are not on the same domain or subdomain
              Authorization: `Bearer ${newRefreshToken}`,
            },
          }
        );

        // setting the new access token in the header
        // TODO: this is not usefull if you commented "axiosInstance.request(originalRequest);"
        // TODO: comment it if you want  but it will not affect the code. I am just setting it for the testing purpose
        originalRequest.headers.Authorization = `Bearer ${refRes.data.data.refreshToken.accessToken}`;

        // this is responsing good but not setting the cookie and redirecting
        // I have tried by throwing, and by returning also not working
        // So this is the way so that I can see if the tokens are refreshing or not
        // You can avoid this line
        const session_res = await createUserSession(
          refRes.data.data.refreshToken.accessToken,
          refRes.data.data.refreshToken.refreshToken,
          "/"
        );

        // lets set the new tokens that are ready to export and our loader and action function is watching on it
        lateAccessToken = refRes.data.data.refreshToken.accessToken ?? null;
        lateRefreshToken = refRes.data.data.refreshToken.refreshToken ?? null;

        // logging the response to see if the createUserSession is working or not but it's working
        // It also showing the everything good but not setting the cookie and redirecting
        // As the redirect not work outside of loader and action function
        console.log(session_res);

        // here is the request for retry with new refresh tokens working good
        // But you don't need to use it. We just need to refetch from the loader and action function
        // if you want to use it then uncomment it but it will recall the request here and in the loader or action function too.
        // TODO: uncomment it if you want to use it
        // return axiosInstance.request(originalRequest);
      }

      // reject if the refresh token is expired or empty or any other error than 401 status
      return Promise.reject(error);
    }
  );

  // return the axios instance to use in the loader and action function
  return axiosInstance;
};
