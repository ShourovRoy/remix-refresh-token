import { ActionArgs, ActionFunction, Response, json } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { userLoginRequest, createUserSession } from "~/utils/session.server";

export const action: ActionFunction = async ({ request }: ActionArgs) => {
  const body = await request.formData();
  const email = body.get("email") as string;
  const password = body.get("password") as string;

  if (!email || !password)
    return new Response("Missing email or password", { status: 400 });

  const { data, errors }: { data: any; errors: any } = await userLoginRequest(
    email,
    password,
    request
  );

  if (data && !errors) {
    return createUserSession(
      data.loginUser.accessToken,
      data.loginUser.refreshToken,
      "/"
    );
  }

  return json({
    message: "login successful",
  });
};

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <div>
      <h1>Login</h1>
      <Form method="POST">
        <label htmlFor="email">Email</label>
        <input type="email" id="email" name="email" />
        <br />
        <br />
        <br />
        <label htmlFor="password">Password</label>
        <input type="password" id="password" name="password" />
        <br />
        <br />
        <button type="submit">Login Now</button>
      </Form>
    </div>
  );
}
